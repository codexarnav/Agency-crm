import express from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { createProfileGroup, initializeConnection, getProfiles, getProfileGroups } from "../services/postproxy.service.js";

const router = express.Router();

const getFrontendRedirectUrl = (pathWithQuery) => {
    const baseUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
    return `${baseUrl}/${pathWithQuery.replace(/^\//, "")}`;
};

const getBackendCallbackUrl = (req, clientId) => {
    const baseUrl = (process.env.BACKEND_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
    return `${baseUrl}/auth/postproxy/callback?clientId=${clientId}`;
};

// Initiate connection flow: GET /auth/postproxy/connect
router.get("/postproxy/connect", async (req, res) => {
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
        const clientId = decoded.id;

        // Fetch client to ensure validity and get postproxyGroupId
        const client = await prisma.client.findUnique({
            where: { id: clientId }
        });

        if (!client) {
            console.error(`❌ Auth PostProxy: Client not found for ID: ${clientId}`);
            return res.redirect(getFrontendRedirectUrl("client/settings/social?error=oauth_failed"));
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
                return res.redirect(getFrontendRedirectUrl("client/settings/social?error=oauth_failed"));
            }
        }

        // Initialize connection with PostProxy
        const callbackUrl = getBackendCallbackUrl(req, clientId);
        console.log(`Initializing PostProxy connection for platform: ${platform}, callback URL: ${callbackUrl}`);
        const { url: oauthUrl } = await initializeConnection(groupId, platform, callbackUrl);

        // Redirect user to PostProxy OAuth URL
        return res.redirect(oauthUrl);
    } catch (error) {
        console.error("❌ Auth PostProxy Connect Error:", error);
        return res.redirect(getFrontendRedirectUrl("client/settings/social?error=oauth_failed"));
    }
});

// OAuth Callback flow: GET /auth/postproxy/callback
router.get("/postproxy/callback", async (req, res) => {
    const { clientId, error } = req.query;

    if (error || !clientId) {
        console.error("❌ PostProxy OAuth Callback Error or Client ID Missing:", error);
        return res.redirect(getFrontendRedirectUrl("client/settings/social?error=oauth_failed"));
    }

    try {
        const client = await prisma.client.findUnique({
            where: { id: clientId }
        });

        if (!client || !client.postproxyGroupId) {
            console.error(`❌ Client or profile group not found for ID: ${clientId}`);
            return res.redirect(getFrontendRedirectUrl("client/settings/social?error=oauth_failed"));
        }

        const groupId = client.postproxyGroupId;

        // Fetch all connected profiles for this group from PostProxy
        console.log(`Fetching PostProxy profiles for client: ${client.companyName || client.brandName} (group: ${groupId})`);
        const profiles = await getProfiles(groupId);

        if (profiles.length === 0) {
            console.warn("⚠️ No connected profiles returned from PostProxy for group:", groupId);
        }

        // Synchronize profiles in database
        for (const profile of profiles) {
            await prisma.socialConnection.upsert({
                where: {
                    clientId_platform: {
                        clientId: clientId,
                        platform: profile.platform.toLowerCase()
                    }
                },
                update: {
                    postproxyProfileId: profile.id,
                    profileName: profile.username || profile.name || "",
                    profileGroupId: groupId
                },
                create: {
                    clientId: clientId,
                    platform: profile.platform.toLowerCase(),
                    postproxyProfileId: profile.id,
                    profileName: profile.username || profile.name || "",
                    profileGroupId: groupId
                }
            });
        }

        console.log(`✅ PostProxy OAuth Callback Success for Client ${clientId}. Synced ${profiles.length} profiles.`);
        return res.redirect(getFrontendRedirectUrl("client/settings/social?success=true"));
    } catch (err) {
        console.error("❌ PostProxy OAuth Callback Process Exception:", err);
        return res.redirect(getFrontendRedirectUrl("client/settings/social?error=oauth_failed"));
    }
});

export default router;
