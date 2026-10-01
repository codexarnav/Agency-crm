import prisma from "../config/prisma.js";
import jwt from "jsonwebtoken";
import {
    deleteIntegration,
    getConnectionUrl,
    listIntegrations,
    toCrmPlatform,
    toPostizPlatform,
} from "../services/postiz.service.js";

const supportedPlatforms = new Set(["facebook", "instagram", "linkedin", "youtube", "x", "tiktok"]);

const validatePlatform = (platform) => {
    const normalized = toPostizPlatform(platform);
    if (!supportedPlatforms.has(normalized)) {
        const error = new Error(`Unsupported social platform: ${platform}`);
        error.status = 400;
        throw error;
    }
    return normalized;
};

const getConnectionSecret = () => {
    if (!process.env.JWT_SECRET) {
        const error = new Error("JWT_SECRET is not configured");
        error.status = 500;
        throw error;
    }
    return process.env.JWT_SECRET;
};

const resolveClient = async (req, requestedClientId = null) => {
    const canManageClients = req.user.role === "SUPER_ADMIN" || req.user.role === "MANAGER";
    const clientId = canManageClients && requestedClientId ? requestedClientId : req.user.id;
    const client = await prisma.client.findUnique({ where: { id: clientId } });

    if (!client) {
        const error = new Error("Client not found");
        error.status = 404;
        throw error;
    }
    if (req.user.role === "MANAGER" && client.companyId !== req.user.companyId) {
        const error = new Error("Access denied for this client");
        error.status = 403;
        throw error;
    }
    if (!canManageClients && client.id !== req.user.id) {
        const error = new Error("Access denied for this client");
        error.status = 403;
        throw error;
    }
    return client;
};

const normalizeKnownIds = (value) => {
    if (!Array.isArray(value)) return [];
    return value.filter((id) => typeof id === "string" && id.length > 0);
};

const getConnectionData = (connections) => {
    const data = {
        instagram: { connected: false, username: "", businessId: "", connectedAt: null },
        facebook: { connected: false, pageName: "", pageId: "", connectedAt: null },
        linkedin: { connected: false, username: "", businessId: "", connectedAt: null },
        youtube: { connected: false, username: "", businessId: "", connectedAt: null },
        twitter: { connected: false, username: "", businessId: "", connectedAt: null },
        tiktok: { connected: false, username: "", businessId: "", connectedAt: null },
    };

    for (const connection of connections) {
        const platform = toCrmPlatform(connection.platform);
        data[platform] = {
            connected: true,
            username: connection.profileName || "",
            businessId: connection.postizIntegrationId,
            connectedAt: connection.connectedAt.toISOString(),
            pageName: connection.profileName || "",
            pageId: connection.postizIntegrationId,
        };
    }
    return data;
};

export const getSocialConnections = async (req, res) => {
    try {
        const client = await resolveClient(req);
        const connections = await prisma.socialConnection.findMany({
            where: {
                clientId: client.id,
                postizIntegrationId: { not: null },
            },
        });
        return res.status(200).json({ success: true, data: getConnectionData(connections) });
    } catch (error) {
        console.error("Error retrieving social connections:", error);
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

export const beginConnection = async (req, res) => {
    try {
        const client = await resolveClient(req, req.body?.clientId);
        const platform = validatePlatform(req.params.platform);
        const integrations = await listIntegrations();
        const knownIntegrationIds = integrations
            .filter((integration) => toPostizPlatform(integration.identifier) === platform)
            .map((integration) => integration.id);
        const url = await getConnectionUrl(platform);
        const connectionToken = jwt.sign(
            {
                type: "postiz_connection",
                clientId: client.id,
                platform,
                knownIntegrationIds,
                initiatedBy: req.user.id,
            },
            getConnectionSecret(),
            { expiresIn: "15m" }
        );

        return res.status(200).json({
            success: true,
            data: { url, connectionToken },
        });
    } catch (error) {
        console.error("Error starting Postiz connection:", error);
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

export const syncConnection = async (req, res) => {
    try {
        const postizPlatform = validatePlatform(req.params.platform);
        const crmPlatform = toCrmPlatform(postizPlatform);
        let pendingConnection;
        try {
            pendingConnection = jwt.verify(req.body?.connectionToken, getConnectionSecret());
        } catch {
            const error = new Error("The Postiz connection session is invalid or expired. Start the connection again.");
            error.status = 400;
            throw error;
        }
        if (
            pendingConnection.type !== "postiz_connection" ||
            pendingConnection.platform !== postizPlatform ||
            pendingConnection.initiatedBy !== req.user.id
        ) {
            const error = new Error("The Postiz connection session does not match this request.");
            error.status = 400;
            throw error;
        }

        const client = await resolveClient(req, pendingConnection.clientId);
        const knownIds = new Set(normalizeKnownIds(pendingConnection.knownIntegrationIds));
        const integrations = await listIntegrations();
        const candidates = integrations.filter(
            (integration) =>
                toPostizPlatform(integration.identifier) === postizPlatform &&
                !knownIds.has(integration.id)
        );

        if (candidates.length === 0) {
            return res.status(200).json({
                success: false,
                pending: true,
                message: "No newly connected Postiz channel was found yet",
            });
        }
        if (candidates.length > 1) {
            return res.status(409).json({
                success: false,
                message: "Multiple new Postiz channels were found. Connect one channel at a time and try again.",
            });
        }

        const integration = candidates[0];
        const alreadyAssigned = await prisma.socialConnection.findFirst({
            where: {
                postizIntegrationId: integration.id,
                clientId: { not: client.id },
            },
        });
        if (alreadyAssigned) {
            return res.status(409).json({
                success: false,
                message: "This Postiz channel is already assigned to another CRM client.",
            });
        }

        const connection = await prisma.socialConnection.upsert({
            where: {
                clientId_platform: {
                    clientId: client.id,
                    platform: crmPlatform,
                },
            },
            update: {
                postizIntegrationId: integration.id,
                postizGroupId: integration.customer?.id || null,
                profileName: integration.profile || integration.name || "",
                connectedAt: new Date(),
            },
            create: {
                clientId: client.id,
                platform: crmPlatform,
                postizIntegrationId: integration.id,
                postizGroupId: integration.customer?.id || null,
                profileName: integration.profile || integration.name || "",
            },
        });

        return res.status(200).json({
            success: true,
            data: {
                platform: connection.platform,
                profileName: connection.profileName,
            },
        });
    } catch (error) {
        console.error("Error syncing Postiz connection:", error);
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};
export const disconnectPlatform = async (req, res) => {
    try {
        const client = await resolveClient(req, req.query.clientId);
        const platform = toCrmPlatform(validatePlatform(req.params.platform));
        const connection = await prisma.socialConnection.findUnique({
            where: {
                clientId_platform: { clientId: client.id, platform },
            },
        });

        if (connection?.postizIntegrationId) {
            await deleteIntegration(connection.postizIntegrationId);
        }
        await prisma.socialConnection.deleteMany({
            where: { clientId: client.id, platform },
        });

        return res.status(200).json({
            success: true,
            message: `Disconnected ${platform} successfully`,
        });
    } catch (error) {
        console.error(`Error disconnecting platform ${req.params.platform}:`, error);
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};
