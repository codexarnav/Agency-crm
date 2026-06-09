import prisma from "../config/prisma.js";

export const CreateRevision = async (taskId, data) => {
    const { feedbackBy, feedbackComment, updatedContentLink } = data;
    return await prisma.revision.create({
        data: {
            taskId,
            feedbackBy,
            feedbackComment,
            updatedContentLink,
        },
    });
};

export const ListRevisions = async (taskId) => {
    return await prisma.revision.findMany({
        where: { taskId },
        orderBy: { createdAt: "asc" },
    });
};
