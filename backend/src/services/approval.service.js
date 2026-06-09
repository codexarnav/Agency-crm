import prisma from "../config/prisma.js";

export const getApprovalDashboard = async (
    companyId
) => {

    const [
        needsReview,
        sentToClient,
        clientResponded,
        finalApproved
    ] = await Promise.all([

        prisma.task.count({
            where: {
                companyId,
                approvalStatus: "PENDING",
            },
        }),

        prisma.task.count({
            where: {
                companyId,
                approvalStatus: "SENT_TO_CLIENT",
            },
        }),

        prisma.task.count({
            where: {
                companyId,
                approvalStatus: "CLIENT_APPROVED",
            },
        }),

        prisma.task.count({
            where: {
                companyId,
                approvalStatus: "FINAL_APPROVED",
            },
        }),
    ]);

    return {
        needsReview,
        sentToClient,
        clientResponded,
        finalApproved,
    };
};

export const getApprovalQueue = async (
    companyId
) => {

    return await prisma.task.findMany({
        where: {
            companyId,
        },

        include: {
            client: true,
            employee: true,
            manager: true,
        },

        orderBy: {
            createdAt: "desc",
        },
    });
};

export const managerApproveTask = async (
    taskId
) => {

    return await prisma.task.update({
        where: {
            id: taskId,
        },

        data: {
            approvalStatus: "MANAGER_APPROVED",
            approvalUpdatedAt: new Date(),
        },
    });
};

export const sendTaskToClient = async (
    taskId
) => {

    return await prisma.task.update({
        where: {
            id: taskId,
        },

        data: {
            approvalStatus: "SENT_TO_CLIENT",
            approvalUpdatedAt: new Date(),
        },
    });
};

export const clientApproveTask = async (
    taskId
) => {

    return await prisma.task.update({
        where: {
            id: taskId,
        },

        data: {
            approvalStatus: "FINAL_APPROVED",
            approvalUpdatedAt: new Date(),
        },
    });
};

export const clientRequestChanges = async (
    taskId,
    comment
) => {
    // Create the revision record in the database
    await prisma.revision.create({
        data: {
            taskId,
            feedbackBy: "Client",
            feedbackComment: comment,
        },
    });

    return await prisma.task.update({
        where: {
            id: taskId,
        },

        data: {
            approvalStatus: "CHANGES_REQUIRED",
            approvalComment: comment,
            approvalUpdatedAt: new Date(),
            revisionCount: {
                increment: 1,
            },
        },
    });
};