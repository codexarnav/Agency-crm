import express from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { createProfileGroup, initializeConnection, getProfiles, getProfileGroups } from "../services/postproxy.service.js";

const router = express.Router();

const getFrontendRedirectUrl = (pathWithQuery) => {
    const baseUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
    return `${baseUrl}/${pathWithQuery.replace(/^\//, "")}`;
};

const getBackendCallbackUrl = (req, clientId, isAgent = false) => {
    // Use BACKEND_URL if set; otherwise reconstruct from request.
    // Behind reverse proxies (Render, Railway, etc.), req.protocol may be 'http'.
    // Check x-forwarded-proto header for the real protocol.
    let baseUrl;
    if (process.env.BACKEND_URL) {
        baseUrl = process.env.BACKEND_URL.replace(/\/$/, "");
    } else {
        const proto = req.get("x-forwarded-proto") || req.protocol;
        baseUrl = `${proto}://${req.get("host")}`;
    }
    const callbackUrl = `${baseUrl}/auth/postproxy/callback?clientId=${clientId}${isAgent ? "&agent=true" : ""}`;
    console.log(`[PostProxy Debug] Constructed callback URL: ${callbackUrl}`);
    console.log(`[PostProxy Debug] BACKEND_URL env: ${process.env.BACKEND_URL || "NOT SET"}`);
    console.log(`[PostProxy Debug] req.protocol: ${req.protocol}, x-forwarded-proto: ${req.get("x-forwarded-proto") || "none"}, host: ${req.get("host")}`);
    return callbackUrl;
};

// ─── Diagnostic Debug Endpoint ───────────────────────────────────────────────
router.get("/postproxy/debug", async (req, res) => {
    try {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            env: {
                BACKEND_URL: process.env.BACKEND_URL || "NOT SET",
                FRONTEND_URL: process.env.FRONTEND_URL || "NOT SET",
                POSTPROXY_API_KEY: process.env.POSTPROXY_API_KEY ? "SET (" + process.env.POSTPROXY_API_KEY.substring(0, 8) + "...)" : "NOT SET",
                POSTPROXY_API_URL: process.env.POSTPROXY_API_URL || "NOT SET (default: https://api.postproxy.dev)",
            },
            request: {
                protocol: req.protocol,
                xForwardedProto: req.get("x-forwarded-proto") || "none",
                host: req.get("host"),
                constructedCallbackUrl: getBackendCallbackUrl(req, "test-client-id"),
            },
            postproxy: {},
        };

        // Test PostProxy API connectivity
        try {
            const groups = await getProfileGroups();
            diagnostics.postproxy.apiReachable = true;
            diagnostics.postproxy.profileGroups = groups;

            // Fetch profiles for each group
            for (const group of groups) {
                try {
                    const profiles = await getProfiles(group.id);
                    diagnostics.postproxy[`group_${group.id}_profiles`] = profiles;
                } catch (profileErr) {
                    diagnostics.postproxy[`group_${group.id}_error`] = profileErr.message;
                }
            }
        } catch (apiErr) {
            diagnostics.postproxy.apiReachable = false;
            diagnostics.postproxy.error = apiErr.message;
        }

        // Check DB for social connections and clients with postproxyGroupId
        try {
            const clientsWithGroups = await prisma.client.findMany({
                where: { postproxyGroupId: { not: null } },
                select: { id: true, companyName: true, brandName: true, postproxyGroupId: true }
            });
            diagnostics.database = {
                clientsWithPostproxyGroup: clientsWithGroups,
            };

            const socialConnections = await prisma.socialConnection.findMany({
                select: { id: true, clientId: true, platform: true, postproxyProfileId: true, profileName: true, profileGroupId: true }
            });
            diagnostics.database.socialConnections = socialConnections;
        } catch (dbErr) {
            diagnostics.database = { error: dbErr.message };
        }

        return res.json(diagnostics);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Initiate connection flow: GET /auth/postproxy/connect
router.get("/postproxy/connect", async (req, res) => {
    let isAgent = false;
    try {
        const { token, platform } = req.query;
        if (!token) {
            console.error("❌ Auth PostProxy: No token provided in query parameters");
            return res.redirect(getFrontendRedirectUrl("client/settings/social?error=oauth_failed"));
        }

        if (!platform) {
            console.error("❌ Auth PostProxy: No platform provided in query parameters");
            return res.redirect(getFrontendRedirectUrl("client/settings/social?error=oauth_failed"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let clientId = decoded.id;

        if ((decoded.role === "SUPER_ADMIN" || decoded.role === "MANAGER") && req.query.clientId) {
            clientId = req.query.clientId;
            isAgent = true;
        }

        // Fetch client to ensure validity and get postproxyGroupId
        const client = await prisma.client.findUnique({
            where: { id: clientId }
        });

        if (!client) {
            console.error(`❌ Auth PostProxy: Client not found for ID: ${clientId}`);
            if (isAgent) {
                return res.redirect(getFrontendRedirectUrl("clients?error=oauth_failed"));
            }
            return res.redirect(getFrontendRedirectUrl("client/settings/social?error=oauth_failed"));
        }

        let groupId = client.postproxyGroupId;

        // Validate that the stored group ID actually exists on PostProxy.
        // Profile groups can become stale if the PostProxy account was reset/recreated.
        if (groupId) {
            try {
                console.log(`[PostProxy Connect] Validating stored group ID: ${groupId}`);
                await getProfiles(groupId); // This will throw if the group doesn't exist
                console.log(`[PostProxy Connect] ✅ Group ${groupId} is valid`);
            } catch (validationErr) {
                console.warn(`[PostProxy Connect] ⚠️ Stored group ID ${groupId} is STALE/INVALID: ${validationErr.message}`);
                console.warn(`[PostProxy Connect] Clearing stale group ID and creating a fresh one...`);
                groupId = null;
                // Clear the stale group ID and any stale social connections
                await prisma.client.update({
                    where: { id: clientId },
                    data: { postproxyGroupId: null }
                });
                await prisma.socialConnection.deleteMany({
                    where: { clientId }
                });
            }
        }

        // If client doesn't have a valid PostProxy profile group, create or find one
        if (!groupId) {
            try {
                // Fetch all existing profile groups from PostProxy to see if there's an existing match or fallback
                console.log("Fetching existing PostProxy profile groups...");
                const existingGroups = await getProfileGroups();

                const targetName = (client.companyName || client.brandName || "").trim().toLowerCase();
                let matchedGroup = null;
                if (targetName) {
                    matchedGroup = existingGroups.find(g => (g.name || "").trim().toLowerCase() === targetName);
                }

                if (matchedGroup) {
                    groupId = matchedGroup.id;
                    console.log(`Found matching PostProxy profile group: "${matchedGroup.name}" (ID: ${groupId})`);
                } else {
                    // Try to create a new group
                    console.log(`Creating PostProxy Profile Group for client: ${client.companyName || client.brandName}`);
                    try {
                        const newGroup = await createProfileGroup(client.companyName || client.brandName || `Client ${clientId}`);
                        groupId = newGroup.id;
                    } catch (createError) {
                        console.warn("⚠️ Failed to create PostProxy profile group, checking for fallback:", createError.message);

                        // Fallback logic: check if any existing group can be used
                        if (existingGroups.length > 0) {
                            // Look for "Default" group, or just use the first available group
                            const defaultGroup = existingGroups.find(g => (g.name || "").trim().toLowerCase() === "default") || existingGroups[0];
                            groupId = defaultGroup.id;
                            console.log(`Fallback: using existing group "${defaultGroup.name}" (ID: ${groupId})`);
                        } else {
                            // No groups exist and creation failed, rethrow
                            throw createError;
                        }
                    }
                }

                // Save the group ID on the client
                await prisma.client.update({
                    where: { id: clientId },
                    data: { postproxyGroupId: groupId }
                });
            } catch (groupError) {
                console.error("❌ Failed to resolve PostProxy profile group:", groupError);
                if (isAgent) {
                    return res.redirect(getFrontendRedirectUrl("clients?error=oauth_failed"));
                }
                return res.redirect(getFrontendRedirectUrl("client/settings/social?error=oauth_failed"));
            }
        }

        // Initialize connection with PostProxy
        const callbackUrl = getBackendCallbackUrl(req, clientId, isAgent);
        console.log(`[PostProxy Connect] ▶ Platform: ${platform}, GroupID: ${groupId}, ClientID: ${clientId}`);
        console.log(`[PostProxy Connect] ▶ Callback URL sent to PostProxy: ${callbackUrl}`);
        const { url: oauthUrl } = await initializeConnection(groupId, platform, callbackUrl);
        console.log(`[PostProxy Connect] ▶ OAuth URL received: ${oauthUrl}`);

        // Redirect user to PostProxy OAuth URL
        return res.redirect(oauthUrl);
    } catch (error) {
        console.error("❌ Auth PostProxy Connect Error:", error);
        if (isAgent) {
            return res.redirect(getFrontendRedirectUrl("clients?error=oauth_failed"));
        }
        return res.redirect(getFrontendRedirectUrl("client/settings/social?error=oauth_failed"));
    }
});

// OAuth Callback flow: GET /auth/postproxy/callback
router.get("/postproxy/callback", async (req, res) => {
    console.log(`[PostProxy Callback] ◀ CALLBACK HIT! Full query:`, JSON.stringify(req.query));
    console.log(`[PostProxy Callback] ◀ Full URL: ${req.protocol}://${req.get("host")}${req.originalUrl}`);
    const { clientId, error, agent } = req.query;

    if (error || !clientId) {
        console.error("❌ PostProxy OAuth Callback Error or Client ID Missing:", error, "clientId:", clientId);
        if (agent === "true") {
            return res.redirect(getFrontendRedirectUrl("clients?error=oauth_failed"));
        }
        return res.redirect(getFrontendRedirectUrl("client/settings/social?error=oauth_failed"));
    }

    try {
        const client = await prisma.client.findUnique({
            where: { id: clientId }
        });

        if (!client || !client.postproxyGroupId) {
            console.error(`❌ Client not found or no postproxyGroupId for ID: ${clientId}. Client exists: ${!!client}, groupId: ${client?.postproxyGroupId}`);
            if (agent === "true") {
                return res.redirect(getFrontendRedirectUrl("clients?error=oauth_failed"));
            }
            return res.redirect(getFrontendRedirectUrl("client/settings/social?error=oauth_failed"));
        }

        const groupId = client.postproxyGroupId;

        // Fetch all connected profiles for this group from PostProxy
        // Add retry logic — PostProxy may need a moment to finalize the profile after OAuth
        console.log(`[PostProxy Callback] Fetching profiles for client: ${client.companyName || client.brandName} (group: ${groupId})`);
        let profiles = await getProfiles(groupId);
        console.log(`[PostProxy Callback] First fetch: ${profiles.length} profiles found:`, JSON.stringify(profiles));

        if (profiles.length === 0) {
            // Retry after a short delay — PostProxy may not have finished processing the OAuth
            console.log(`[PostProxy Callback] 0 profiles, retrying in 3 seconds...`);
            await new Promise(r => setTimeout(r, 3000));
            profiles = await getProfiles(groupId);
            console.log(`[PostProxy Callback] Retry fetch: ${profiles.length} profiles found:`, JSON.stringify(profiles));
        }

        if (profiles.length === 0) {
            console.warn("⚠️ Still 0 profiles after retry for group:", groupId);
        }

        const normalizePlatform = (p) => {
            if (!p) return "";
            const lower = p.toLowerCase();
            if (lower.includes("facebook")) return "facebook";
            if (lower.includes("instagram")) return "instagram";
            if (lower.includes("linkedin")) return "linkedin";
            if (lower.includes("youtube") || lower.includes("google")) return "youtube";
            if (lower.includes("twitter") || lower === "x") return "twitter";
            if (lower.includes("tiktok")) return "tiktok";
            return lower;
        };

        // Synchronize profiles in database
        for (const profile of profiles) {
            const platformKey = normalizePlatform(profile.platform);
            await prisma.socialConnection.upsert({
                where: {
                    clientId_platform: {
                        clientId: clientId,
                        platform: platformKey
                    }
                },
                update: {
                    postproxyProfileId: profile.id,
                    profileName: profile.username || profile.name || "",
                    profileGroupId: groupId
                },
                create: {
                    clientId: clientId,
                    platform: platformKey,
                    postproxyProfileId: profile.id,
                    profileName: profile.username || profile.name || "",
                    profileGroupId: groupId
                }
            });
        }

        console.log(`✅ PostProxy OAuth Callback Success for Client ${clientId}. Synced ${profiles.length} profiles.`);
        if (agent === "true") {
            return res.redirect(getFrontendRedirectUrl(`clients?success=true&clientId=${clientId}`));
        }
        return res.redirect(getFrontendRedirectUrl("client/settings/social?success=true"));
    } catch (err) {
        console.error("❌ PostProxy OAuth Callback Process Exception:", err);
        if (agent === "true") {
            return res.redirect(getFrontendRedirectUrl("clients?error=oauth_failed"));
        }
        return res.redirect(getFrontendRedirectUrl("client/settings/social?error=oauth_failed"));
    }
});

export default router;
