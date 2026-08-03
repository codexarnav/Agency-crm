import prisma from "../config/prisma.js";

// GET /api/social/connections
export const getSocialConnections = async (req, res) => {
    try {
        let clientId = req.user.id;
        const userRole = (req.user.role || "").toUpperCase();
        const isStaff = userRole.includes("ADMIN") || userRole.includes("MANAGER") || userRole.includes("EMPLOYEE") || userRole !== "CLIENT";
        if (req.query.clientId && isStaff) {
            clientId = req.query.clientId;
        }

        // Verify that target client exists
        const client = await prisma.client.findUnique({
            where: { id: clientId }
        });

        if (!client) {
            return res.status(404).json({ success: false, message: "Client not found" });
        }

        const connections = await prisma.socialConnection.findMany({
            where: { clientId: clientId }
        });

        // Helper to normalize platform names
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

        // Initialize with default platforms for UI safety across all supported channels
        const data = {
            instagram: { connected: false, username: "", businessId: "", connectedAt: null },
            facebook: { connected: false, pageName: "", pageId: "", connectedAt: null },
            linkedin: { connected: false, username: "", businessId: "", connectedAt: null },
            youtube: { connected: false, username: "", businessId: "", connectedAt: null },
            twitter: { connected: false, username: "", businessId: "", connectedAt: null },
            tiktok: { connected: false, username: "", businessId: "", connectedAt: null },
        };

        // Populate connected platforms dynamically
        for (const conn of connections) {
            const platform = normalizePlatform(conn.platform);
            data[platform] = {
                connected: true,
                username: conn.profileName || "",
                businessId: conn.postproxyProfileId,
                connectedAt: conn.connectedAt.toISOString(),
                // Extra fields for compatibility between fb/instagram card layouts
                pageName: conn.profileName || "",
                pageId: conn.postproxyProfileId,
            };
        }

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Error retrieving social connections:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/social/connections/facebook
export const disconnectFacebook = async (req, res) => {
    try {
        let clientId = req.user.id;
        const userRole = (req.user.role || "").toUpperCase();
        const isStaff = userRole.includes("ADMIN") || userRole.includes("MANAGER") || userRole.includes("EMPLOYEE") || userRole !== "CLIENT";
        if (req.query.clientId && isStaff) {
            clientId = req.query.clientId;
        }
        await prisma.socialConnection.deleteMany({
            where: {
                clientId,
                platform: "facebook"
            }
        });
        return res.status(200).json({ success: true, message: "Disconnected Facebook successfully" });
    } catch (error) {
        console.error("Error disconnecting Facebook:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/social/connections/instagram
export const disconnectInstagram = async (req, res) => {
    try {
        let clientId = req.user.id;
        const userRole = (req.user.role || "").toUpperCase();
        const isStaff = userRole.includes("ADMIN") || userRole.includes("MANAGER") || userRole.includes("EMPLOYEE") || userRole !== "CLIENT";
        if (req.query.clientId && isStaff) {
            clientId = req.query.clientId;
        }
        await prisma.socialConnection.deleteMany({
            where: {
                clientId,
                platform: "instagram"
            }
        });
        return res.status(200).json({ success: true, message: "Disconnected Instagram successfully" });
    } catch (error) {
        console.error("Error disconnecting Instagram:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/social/connections/:platform
export const disconnectPlatform = async (req, res) => {
    try {
        let clientId = req.user.id;
        const userRole = (req.user.role || "").toUpperCase();
        const isStaff = userRole.includes("ADMIN") || userRole.includes("MANAGER") || userRole.includes("EMPLOYEE") || userRole !== "CLIENT";
        if (req.query.clientId && isStaff) {
            clientId = req.query.clientId;
        }
        const { platform } = req.params;
        await prisma.socialConnection.deleteMany({
            where: {
                clientId,
                platform: platform.toLowerCase()
            }
        });
        return res.status(200).json({ success: true, message: `Disconnected ${platform} successfully` });
    } catch (error) {
        console.error(`Error disconnecting platform ${platform}:`, error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
