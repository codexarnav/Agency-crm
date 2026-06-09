import prisma from "../config/prisma.js";

const PRIORITY_MAP_FE_TO_BE = {
    "low": "LOW",
    "medium": "MEDIUM",
    "high": "HIGH"
};

const PRIORITY_MAP_BE_TO_FE = {
    "LOW": "low",
    "MEDIUM": "medium",
    "HIGH": "high"
};

export const createAnnouncement = async (data, loggedInUser) => {
    const {
        title,
        body, // Frontend sends "body", backend model maps it to "content"
        priority,
        expiresAt,
        audience,
        specificClientId,
        specificEmployeeId
    } = data;

    const priorityEnum = PRIORITY_MAP_FE_TO_BE[priority] || "MEDIUM";

    const announcement = await prisma.announcement.create({
        data: {
            companyId: loggedInUser.companyId,
            createdById: loggedInUser.id,
            title,
            content: body || "",
            priority: priorityEnum,
            announcementDate: new Date(),
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            audience: audience || "everyone",
            specificClientId: specificClientId || null,
            specificEmployeeId: specificEmployeeId || null
        },
    });

    // Create notifications in database for target users
    try {
        if (audience === "everyone") {
            const companyUsers = await prisma.user.findMany({
                where: { companyId: loggedInUser.companyId }
            });
            const notifData = companyUsers
                .filter(u => u.id !== loggedInUser.id)
                .map(u => ({
                    senderId: loggedInUser.id,
                    receiverId: u.id,
                    content: `New Announcement: ${title}`,
                    type: "ANNOUNCEMENT"
                }));
            if (notifData.length > 0) {
                await prisma.notification.createMany({
                    data: notifData
                });
            }
        } else if (audience === "specific_employee" && specificEmployeeId) {
            await prisma.notification.create({
                data: {
                    senderId: loggedInUser.id,
                    receiverId: specificEmployeeId,
                    content: `New Announcement: ${title}`,
                    type: "ANNOUNCEMENT"
                }
            });
        }
    } catch (notifErr) {
        console.error("Failed to create notifications for announcement:", notifErr);
    }

    return {
        id: announcement.id,
        companyId: announcement.companyId,
        createdBy: announcement.createdById,
        title: announcement.title,
        body: announcement.content,
        priority: PRIORITY_MAP_BE_TO_FE[announcement.priority] || "medium",
        announcementDate: announcement.announcementDate,
        expiresAt: announcement.expiresAt,
        audience: announcement.audience,
        specificClientId: announcement.specificClientId,
        specificEmployeeId: announcement.specificEmployeeId,
        createdAt: announcement.createdAt,
        updatedAt: announcement.updatedAt
    };
};

export const getAnnouncements = async (companyId, userId = null, role = null) => {
    const now = new Date();
    let whereClause = { companyId };

    if (role === "EMPLOYEE") {
        whereClause = {
            companyId,
            OR: [
                { expiresAt: null },
                { expiresAt: { gt: now } }
            ],
            AND: [
                {
                    OR: [
                        { audience: "everyone" },
                        { audience: "all_employees" },
                        { specificEmployeeId: userId }
                    ]
                }
            ]
        };
    } else if (role === "CLIENT") {
        whereClause = {
            companyId,
            OR: [
                { expiresAt: null },
                { expiresAt: { gt: now } }
            ],
            AND: [
                {
                    OR: [
                        { audience: "everyone" },
                        { audience: "all_clients" },
                        { specificClientId: userId }
                    ]
                }
            ]
        };
    }

    const announcements = await prisma.announcement.findMany({
        where: whereClause,
        orderBy: {
            createdAt: "desc"
        }
    });

    return announcements.map(announcement => ({
        id: announcement.id,
        companyId: announcement.companyId,
        createdBy: announcement.createdById,
        title: announcement.title,
        body: announcement.content,
        priority: PRIORITY_MAP_BE_TO_FE[announcement.priority] || "medium",
        announcementDate: announcement.announcementDate,
        expiresAt: announcement.expiresAt,
        audience: announcement.audience,
        specificClientId: announcement.specificClientId,
        specificEmployeeId: announcement.specificEmployeeId,
        createdAt: announcement.createdAt,
        updatedAt: announcement.updatedAt
    }));
};

export const updateAnnouncement = async (id, companyId, data) => {
    const existing = await prisma.announcement.findFirst({
        where: { id, companyId }
    });

    if (!existing) {
        throw new Error("Announcement not found or access denied");
    }

    const {
        title,
        body,
        priority,
        expiresAt,
        audience,
        specificClientId,
        specificEmployeeId
    } = data;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (body !== undefined) updateData.content = body;
    if (priority !== undefined) updateData.priority = PRIORITY_MAP_FE_TO_BE[priority] || "MEDIUM";
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (audience !== undefined) updateData.audience = audience;
    if (specificClientId !== undefined) updateData.specificClientId = specificClientId || null;
    if (specificEmployeeId !== undefined) updateData.specificEmployeeId = specificEmployeeId || null;

    const announcement = await prisma.announcement.update({
        where: { id },
        data: updateData
    });

    return {
        id: announcement.id,
        companyId: announcement.companyId,
        createdBy: announcement.createdById,
        title: announcement.title,
        body: announcement.content,
        priority: PRIORITY_MAP_BE_TO_FE[announcement.priority] || "medium",
        announcementDate: announcement.announcementDate,
        expiresAt: announcement.expiresAt,
        audience: announcement.audience,
        specificClientId: announcement.specificClientId,
        specificEmployeeId: announcement.specificEmployeeId,
        createdAt: announcement.createdAt,
        updatedAt: announcement.updatedAt
    };
};

export const deleteAnnouncement = async (id, companyId) => {
    const existing = await prisma.announcement.findFirst({
        where: { id, companyId }
    });

    if (!existing) {
        throw new Error("Announcement not found or access denied");
    }

    return await prisma.announcement.delete({
        where: { id }
    });
};