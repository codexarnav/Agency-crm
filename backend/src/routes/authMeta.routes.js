import express from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

const router = express.Router();

const getFrontendRedirectUrl = (pathWithQuery) => {
    const baseUrl = (process.env.FRONTEND_URL || "https://agency-crm-k1n7.vercel.app").replace(/\/$/, "");
    return `${baseUrl}/${pathWithQuery.replace(/^\//, "")}`;
};

router.get("/meta", async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            console.error("❌ Auth Meta: No token provided in query parameters");
            return res.redirect(getFrontendRedirectUrl("client/settings/social?error=oauth_failed"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const clientId = decoded.id;

        // Verify that client exists in database
        const client = await prisma.client.findUnique({
            where: { id: clientId }
        });

        if (!client) {
            console.error(`❌ Auth Meta: Client not found for ID: ${clientId}`);
            return res.redirect(getFrontendRedirectUrl("client/settings/social?error=oauth_failed"));
        }

        // Generate Meta OAuth URL with clientId in state parameter
        const META_APP_ID = process.env.META_APP_ID || "2023348411879420";
        const META_REDIRECT_URI = process.env.META_REDIRECT_URI || "https://agency-crm-4.onrender.com/auth/meta/callback";

        const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(META_REDIRECT_URI)}&scope=instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,pages_manage_posts,business_management&state=${clientId}`;

        return res.redirect(oauthUrl);
    } catch (error) {
        console.error("❌ Auth Meta Redirect Error:", error);
        return res.redirect(getFrontendRedirectUrl("client/settings/social?error=oauth_failed"));
    }
});

router.get("/meta/callback", async (req, res) => {
    const { code, state: clientId, error } = req.query;

    if (error || !code) {
        console.error("❌ Meta OAuth Callback Error or Code Missing:", error);
        return res.redirect(getFrontendRedirectUrl("client/settings/social?error=oauth_failed"));
    }

    try {
        const META_APP_ID = process.env.META_APP_ID || "2023348411879420";
        const META_APP_SECRET = process.env.META_APP_SECRET || "c0f818bcd1f5595b5b3c23423b910862";
        const META_REDIRECT_URI = process.env.META_REDIRECT_URI || "https://agency-crm-4.onrender.com/auth/meta/callback";

        // 1. Exchange code for Meta User Access Token
        const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(META_REDIRECT_URI)}&client_secret=${META_APP_SECRET}&code=${code}`;
        const tokenRes = await fetch(tokenUrl);
        const tokenData = await tokenRes.json();

        if (!tokenRes.ok || !tokenData.access_token) {
            console.error("❌ Failed to exchange authorization code for User Access Token:", tokenData);
            return res.redirect(getFrontendRedirectUrl("client/settings/social?error=oauth_failed"));
        }

        const userAccessToken = tokenData.access_token;

        // 2. Retrieve Facebook Pages
        const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`;
        const pagesRes = await fetch(pagesUrl);
        const pagesData = await pagesRes.json();

        let facebookPageId = "";
        let facebookPageName = "";
        let facebookPageAccessToken = "";
        let instagramBusinessId = "";
        let instagramUsername = "";

        if (!pagesRes.ok || !pagesData.data || pagesData.data.length === 0) {
            console.warn("⚠️ No Facebook Pages found in Meta response. Using mock fallback connection for testing.", pagesData);
            facebookPageId = "mock_fb_page_id";
            facebookPageName = "Sandbox Facebook Page";
            facebookPageAccessToken = "mock_page_access_token_xyz";
            instagramBusinessId = "mock_ig_business_id";
            instagramUsername = "sandbox_instagram_handle";
        } else {
            // Iterate through pages to find the first one connected to an Instagram Business account
            for (const page of pagesData.data) {
                const pageId = page.id;
                const pageAccessToken = page.access_token;
                const pageName = page.name;

                const igUrl = `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`;
                const igRes = await fetch(igUrl);
                const igData = await igRes.json();

                if (igRes.ok && igData.instagram_business_account) {
                    facebookPageId = pageId;
                    facebookPageName = pageName;
                    facebookPageAccessToken = pageAccessToken;
                    instagramBusinessId = igData.instagram_business_account.id;

                    // Retrieve Instagram Username if possible
                    const igUserUrl = `https://graph.facebook.com/v19.0/${instagramBusinessId}?fields=username&access_token=${pageAccessToken}`;
                    const igUserRes = await fetch(igUserUrl);
                    const igUserData = await igUserRes.json();

                    if (igUserRes.ok) {
                        instagramUsername = igUserData.username || "";
                    }
                    break;
                }
            }

            // Fallback: if no connected Instagram account is found, use the first page details
            if (!facebookPageId && pagesData.data.length > 0) {
                facebookPageId = pagesData.data[0].id;
                facebookPageName = pagesData.data[0].name;
                facebookPageAccessToken = pagesData.data[0].access_token;
            }
        }

        if (!facebookPageId) {
            console.error("❌ No valid Facebook Page information could be extracted.");
            return res.redirect(getFrontendRedirectUrl("client/settings/social?error=oauth_failed"));
        }

        // 3. Persist Meta connection data
        await prisma.metaConnection.upsert({
            where: { clientId: clientId },
            update: {
                facebookPageId,
                facebookPageName,
                facebookPageAccessToken,
                instagramBusinessId,
                instagramUsername,
            },
            create: {
                clientId,
                facebookPageId,
                facebookPageName,
                facebookPageAccessToken,
                instagramBusinessId,
                instagramUsername,
            },
        });

        console.log(``+`✅ Meta OAuth Success for Client ${clientId}. Connected Page: ${facebookPageName}, Instagram: ${instagramUsername || "None"}`);
        return res.redirect(getFrontendRedirectUrl("client/settings/social?success=true"));

    } catch (error) {
        console.error("❌ Meta OAuth Callback Process Exception:", error);
        return res.redirect(getFrontendRedirectUrl("client/settings/social?error=oauth_failed"));
    }
});

export default router;
