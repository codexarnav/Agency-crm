import prisma from "../config/prisma.js";

// GET /api/social/connections
export const getSocialConnections = async (req, res) => {
    try {
        const clientId = req.user.id;

        // Verify that user is a client
        const client = await prisma.client.findUnique({
            where: { id: clientId }
        });

        if (!client) {
            return res.status(403).json({ success: false, message: "Only clients can access social connection metadata" });
        }

        const metaConn = await prisma.metaConnection.findUnique({
            where: { clientId: clientId }
        });

        if (!metaConn) {
            return res.status(200).json({
                success: true,
                data: {
                    instagram: {
                        connected: false,
                        username: "",
                        businessId: "",
                        connectedAt: null,
                    },
                    facebook: {
                        connected: false,
                        pageName: "",
                        pageId: "",
                        connectedAt: null,
                    }
                }
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                instagram: {
                    connected: !!metaConn.instagramBusinessId,
                    username: metaConn.instagramUsername || "",
                    businessId: metaConn.instagramBusinessId || "",
                    connectedAt: metaConn.connectedAt.toISOString(),
                },
                facebook: {
                    connected: !!metaConn.facebookPageId,
                    pageName: metaConn.facebookPageName || "",
                    pageId: metaConn.facebookPageId || "",
                    connectedAt: metaConn.connectedAt.toISOString(),
                }
            }
        });
    } catch (error) {
        console.error("Error retrieving social connections:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/social/connections/facebook
export const disconnectFacebook = async (req, res) => {
    return res.status(200).json({
        message: "Disconnect functionality not implemented."
    });
};

// DELETE /api/social/connections/instagram
export const disconnectInstagram = async (req, res) => {
    return res.status(200).json({
        message: "Disconnect functionality not implemented."
    });
};
