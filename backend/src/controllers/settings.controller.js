import prisma from "../config/prisma.js";

// GET /api/settings/company
export const getCompanySettings = async (req, res) => {
    try {
        const company = await prisma.company.findUnique({
            where: { id: req.user.companyId }
        });
        if (!company) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }
        return res.status(200).json({ success: true, data: company });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/settings/company
export const updateCompanySettings = async (req, res) => {
    try {
        const {
            name,
            email,
            phoneNumber,
            website,
            industryType,
            employeeCount,
            address,
            gstId,
            companyLogo,
            timezone
        } = req.body;

        const company = await prisma.company.update({
            where: { id: req.user.companyId },
            data: {
                name,
                email,
                phoneNumber,
                website,
                industryType,
                employeeCount: employeeCount ? Number(employeeCount) : null,
                address,
                gstId,
                companyLogo,
                timezone
            }
        });

        return res.status(200).json({ success: true, data: company });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// GET /api/settings/permissions
export const getPermissionsSettings = async (req, res) => {
    try {
        const company = await prisma.company.findUnique({
            where: { id: req.user.companyId },
            select: { permissions: true }
        });
        const defaultPermissions = {
            createClients: true,
            editClients: true,
            deleteClients: true,
            createEmployees: true,
            assignEmployees: true,
            createTasks: true,
            assignTasks: true,
            approveContent: true,
            schedulePublishing: true,
            createAnnouncements: true,
            viewReports: true
        };
        const permissions = company?.permissions || defaultPermissions;
        return res.status(200).json({ success: true, data: permissions });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/settings/permissions
export const updatePermissionsSettings = async (req, res) => {
    try {
        const company = await prisma.company.update({
            where: { id: req.user.companyId },
            data: {
                permissions: req.body
            }
        });
        return res.status(200).json({ success: true, data: company.permissions });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// GET /api/settings/publishing
export const getPublishingSettings = async (req, res) => {
    try {
        const company = await prisma.company.findUnique({
            where: { id: req.user.companyId },
            select: { publishingConnections: true }
        });
        const defaultConnections = {
            instagram: { status: "Disconnected", username: "" },
            facebook: { status: "Disconnected", username: "" },
            linkedin: { status: "Disconnected", username: "" },
            youtube: { status: "Disconnected", username: "" },
            pinterest: { status: "Disconnected", username: "" }
        };
        const connections = company?.publishingConnections || defaultConnections;
        return res.status(200).json({ success: true, data: connections });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/settings/publishing/connect
export const connectPublishingPlatform = async (req, res) => {
    try {
        const { platform, username } = req.body;
        if (!platform) {
            return res.status(400).json({ success: false, message: "Platform is required" });
        }
        const company = await prisma.company.findUnique({
            where: { id: req.user.companyId },
            select: { publishingConnections: true }
        });
        const defaultConnections = {
            instagram: { status: "Disconnected", username: "" },
            facebook: { status: "Disconnected", username: "" },
            linkedin: { status: "Disconnected", username: "" },
            youtube: { status: "Disconnected", username: "" },
            pinterest: { status: "Disconnected", username: "" }
        };
        const currentConnections = company?.publishingConnections || defaultConnections;
        
        const platformKey = platform.toLowerCase();
        if (currentConnections[platformKey] !== undefined) {
            currentConnections[platformKey] = {
                status: "Connected",
                username: username || `${platform}_user`
            };
        } else {
            return res.status(400).json({ success: false, message: `Invalid platform: ${platform}` });
        }

        await prisma.company.update({
            where: { id: req.user.companyId },
            data: { publishingConnections: currentConnections }
        });

        return res.status(200).json({ success: true, data: currentConnections });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// DELETE /api/settings/publishing/disconnect
export const disconnectPublishingPlatform = async (req, res) => {
    try {
        const { platform } = req.body;
        if (!platform) {
            return res.status(400).json({ success: false, message: "Platform is required" });
        }
        const company = await prisma.company.findUnique({
            where: { id: req.user.companyId },
            select: { publishingConnections: true }
        });
        const defaultConnections = {
            instagram: { status: "Disconnected", username: "" },
            facebook: { status: "Disconnected", username: "" },
            linkedin: { status: "Disconnected", username: "" },
            youtube: { status: "Disconnected", username: "" },
            pinterest: { status: "Disconnected", username: "" }
        };
        const currentConnections = company?.publishingConnections || defaultConnections;
        
        const platformKey = platform.toLowerCase();
        if (currentConnections[platformKey] !== undefined) {
            currentConnections[platformKey] = {
                status: "Disconnected",
                username: ""
            };
        } else {
            return res.status(400).json({ success: false, message: `Invalid platform: ${platform}` });
        }

        await prisma.company.update({
            where: { id: req.user.companyId },
            data: { publishingConnections: currentConnections }
        });

        return res.status(200).json({ success: true, data: currentConnections });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// GET /api/settings/notifications
export const getNotificationsSettings = async (req, res) => {
    try {
        const company = await prisma.company.findUnique({
            where: { id: req.user.companyId },
            select: { notificationPreferences: true }
        });
        const defaultPreferences = {
            taskAssignments: true,
            approvalRequests: true,
            publishingFailures: true,
            clientFeedback: true,
            announcements: true
        };
        const preferences = company?.notificationPreferences || defaultPreferences;
        return res.status(200).json({ success: true, data: preferences });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/settings/notifications
export const updateNotificationsSettings = async (req, res) => {
    try {
        const company = await prisma.company.update({
            where: { id: req.user.companyId },
            data: {
                notificationPreferences: req.body
            }
        });
        return res.status(200).json({ success: true, data: company.notificationPreferences });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};
