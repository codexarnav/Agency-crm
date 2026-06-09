import prisma from "../config/prisma.js";

export const CreateActivityLog = async (data) => {
    const { action, entityType, entityId, userId, details } = data;
    return await prisma.activityLog.create({
        data: {
            action,
            entityType,
            entityId,
            userId,
            details: details || {},
        },
    });
};

export const ListActivityLogs = async (query = {}) => {
    const { action, userId } = query;
    const where = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;

    return await prisma.activityLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: 500,
    });
};
