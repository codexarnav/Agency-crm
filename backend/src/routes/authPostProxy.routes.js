import express from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { createProfileGroup, initializeConnection, getProfiles, getProfileGroups } from "../services/postproxy.service.js";

const router = express.Router();

const getFrontendRedirectUrl = (req, pathWithQuery) => {
    let baseUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
    if (!baseUrl && req) {
        const referer = req.get("referer") || req.get("origin");
        if (referer) {
            try {
                const urlObj = new URL(referer);
                baseUrl = `${urlObj.protocol}//${urlObj.host}`;
            } catch (e) {}
        }
    }
    if (!baseUrl) {
        baseUrl = "http://localhost:5173";
    }
    return `${baseUrl}/${pathWithQuery.replace(/^\//, "")}`;
};

const getBackendCallbackUrl = (req, clientId, isAgent = false) => {
    let baseUrl = (process.env.BACKEND_URL || "").replace(/\/$/, "");
    if (!baseUrl && req) {
        const host = req.get("x-forwarded-host") || req.get("host");
        const proto = req.get("x-forwarded-proto") || req.protocol || "https";
        baseUrl = `${proto}://${host}`;
    }
    return `${baseUrl}/auth/postproxy/callback?clientId=${clientId}${isAgent ? "&agent=true" : ""}`;
};

// Initiate connection flow: GET /auth/postproxy/connect
router.get("/postproxy/connect", async (req, res) => {
    let isAgent = false;
    try {
        const { token, platform } = req.query;
        if (!token) {
            console.error("❌ Auth PostProxy: No token provided in query parameters");
            return res.redirect(getFrontendRedirectUrl(req, "client/settings/social?error=oauth_failed&reason=Missing+token"));
        }

        if (!platform) {
            console.error("❌ Auth PostProxy: No platform provided in query parameters");
            return res.redirect(getFrontendRedirectUrl(req, "client/settings/social?error=oauth_failed&reason=Missing+platform"));
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
                return res.redirect(getFrontendRedirectUrl(req, "clients?error=oauth_failed&reason=Client+not+found"));
            }
            return res.redirect(getFrontendRedirectUrl(req, "client/settings/social?error=oauth_failed&reason=Client+not+found"));
        }

        let groupId = client.postproxyGroupId;

        // If client doesn't have a PostProxy profile group yet, create or find one
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
                const reason = encodeURIComponent(groupError.message || "Group resolution failed");
                if (isAgent) {
                    return res.redirect(getFrontendRedirectUrl(req, `clients?error=oauth_failed&reason=${reason}`));
                }
                return res.redirect(getFrontendRedirectUrl(req, `client/settings/social?error=oauth_failed&reason=${reason}`));
            }
        }

        // Initialize connection with PostProxy
        const callbackUrl = getBackendCallbackUrl(req, clientId, isAgent);
        console.log(`Initializing PostProxy connection for platform: ${platform}, callback URL: ${callbackUrl}`);
        const { url: oauthUrl } = await initializeConnection(groupId, platform, callbackUrl);

        // Redirect user to PostProxy OAuth URL
        return res.redirect(oauthUrl);
    } catch (error) {
        console.error("❌ Auth PostProxy Connect Error:", error);
        const reason = encodeURIComponent(error.message || "Connect failed");
        if (isAgent) {
            return res.redirect(getFrontendRedirectUrl(req, `clients?error=oauth_failed&reason=${reason}`));
        }
        return res.redirect(getFrontendRedirectUrl(req, `client/settings/social?error=oauth_failed&reason=${reason}`));
    }
});

// OAuth Callback flow: GET /auth/postproxy/callback
router.get("/postproxy/callback", async (req, res) => {
    const { clientId, error, agent } = req.query;

    if (error || !clientId) {
        console.error("❌ PostProxy OAuth Callback Error or Client ID Missing:", error);
        const reason = encodeURIComponent(error || "Client ID missing");
        if (agent === "true") {
            return res.redirect(getFrontendRedirectUrl(req, `clients?error=oauth_failed&reason=${reason}`));
        }
        return res.redirect(getFrontendRedirectUrl(req, `client/settings/social?error=oauth_failed&reason=${reason}`));
    }

    try {
        const client = await prisma.client.findUnique({
            where: { id: clientId }
        });

        if (!client || !client.postproxyGroupId) {
            console.error(`❌ Client or profile group not found for ID: ${clientId}`);
            if (agent === "true") {
                return res.redirect(getFrontendRedirectUrl(req, "clients?error=oauth_failed&reason=Client+group+not+found"));
            }
            return res.redirect(getFrontendRedirectUrl(req, "client/settings/social?error=oauth_failed&reason=Client+group+not+found"));
        }

        const groupId = client.postproxyGroupId;

        const normalizePlatform = (p) => {
            if (!p) return "";
            const lower = p.toLowerCase().trim();
            if (lower.includes("facebook") || lower.includes("fb")) return "facebook";
            if (lower.includes("instagram") || lower.includes("ig")) return "instagram";
            if (lower.includes("linkedin")) return "linkedin";
            if (lower.includes("youtube") || lower.includes("google") || lower.includes("yt")) return "youtube";
            if (lower.includes("twitter") || lower.includes("x") || lower === "x" || lower.startsWith("x_") || lower.startsWith("x-")) return "twitter";
            if (lower.includes("tiktok") || lower.includes("tt")) return "tiktok";
            return lower;
        };

        // Fetch all connected profiles for this group from PostProxy
        console.log(`Fetching PostProxy profiles for client: ${client.companyName || client.brandName} (group: ${groupId})`);
        let profiles = await getProfiles(groupId);

        // Retry logic if PostProxy is still finalizing profile creation on redirect
        if (profiles.length === 0) {
            for (let i = 0; i < 3; i++) {
                console.log(`⚠️ Profiles empty, retrying PostProxy getProfiles (attempt ${i + 1}/3)...`);
                await new Promise(r => setTimeout(r, 1000));
                profiles = await getProfiles(groupId);
                if (profiles.length > 0) break;
            }
        }

        // Check if callback query params contain explicit profile data
        const queryPlatform = req.query.platform || req.query.provider || req.query.type;
        const queryProfileId = req.query.profile_id || req.query.profileId || req.query.id;
        const queryUsername = req.query.username || req.query.name || req.query.handle;

        if (queryPlatform && queryProfileId) {
            const alreadyExists = profiles.some(p => String(p.id) === String(queryProfileId));
            if (!alreadyExists) {
                profiles.push({
                    id: queryProfileId,
                    platform: queryPlatform,
                    username: queryUsername || "",
                    name: queryUsername || ""
                });
            }
        }

        if (profiles.length === 0) {
            console.warn("⚠️ No connected profiles returned from PostProxy for group:", groupId);
        }

        // Synchronize profiles in database
        for (const profile of profiles) {
            const platformKey = normalizePlatform(profile.platform);
            if (!platformKey) continue;

            await prisma.socialConnection.upsert({
                where: {
                    clientId_platform: {
                        clientId: clientId,
                        platform: platformKey
                    }
                },
                update: {
                    postproxyProfileId: String(profile.id),
                    profileName: profile.username || profile.name || "",
                    profileGroupId: groupId
                },
                create: {
                    clientId: clientId,
                    platform: platformKey,
                    postproxyProfileId: String(profile.id),
                    profileName: profile.username || profile.name || "",
                    profileGroupId: groupId
                }
            });
        }

        console.log(`✅ PostProxy OAuth Callback Success for Client ${clientId}. Synced ${profiles.length} profiles.`);
        if (agent === "true") {
            return res.redirect(getFrontendRedirectUrl(req, `clients?success=true&clientId=${clientId}`));
        }
        return res.redirect(getFrontendRedirectUrl(req, "client/settings/social?success=true"));
    } catch (err) {
        console.error("❌ PostProxy OAuth Callback Process Exception:", err);
        const reason = encodeURIComponent(err.message || "Callback exception");
        if (agent === "true") {
            return res.redirect(getFrontendRedirectUrl(req, `clients?error=oauth_failed&reason=${reason}`));
        }
        return res.redirect(getFrontendRedirectUrl(req, `client/settings/social?error=oauth_failed&reason=${reason}`));
    }
});

export default router;
