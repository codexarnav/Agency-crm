import prisma from "../config/prisma.js";

export const getOverviewAnalytics = async (companyId) => {
    const [
        planned,
        completed,
        approved,
        posted,
        pendingApproval,
        overdue,
    ] = await Promise.all([
        prisma.task.count({
            where: { companyId },
        }),

        prisma.task.count({
            where: {
                companyId,
                productionStatus: "COMPLETED",
            },
        }),

        prisma.task.count({
            where: {
                companyId,
                approvalStatus: "FINAL_APPROVED",
            },
        }),

        prisma.task.count({
            where: {
                companyId,
                publishingStatus: "POSTED",
            },
        }),

        prisma.task.count({
            where: {
                companyId,
                approvalStatus: "PENDING",
            },
        }),

        prisma.task.count({
            where: {
                companyId,
                dueDate: {
                    lt: new Date(),
                },
                productionStatus: {
                    not: "COMPLETED",
                },
            },
        }),
    ]);

    return {
        planned,
        completed,
        approved,
        posted,
        pendingApproval,
        overdue,
    };
};

export const getMostOverloadedEmployee = async (
    companyId
) => {

    const tasks = await prisma.task.groupBy({
        by: ["employeeId"],

        where: {
            companyId,
        },

        _count: {
            employeeId: true,
        },

        orderBy: {
            _count: {
                employeeId: "desc",
            },
        },

        take: 1,
    });

    if (!tasks.length) return null;

    const employee =
        await prisma.user.findUnique({
            where: {
                id: tasks[0].employeeId,
            },
        });

    return {
        employee,
        taskCount:
            tasks[0]._count.employeeId,
    };
};

export const getHighestRevisionClient =
    async (companyId) => {

        const revisions =
            await prisma.task.groupBy({
                by: ["clientId"],

                where: {
                    companyId,

                    approvalStatus:
                        "CHANGES_REQUIRED",
                },

                _count: {
                    clientId: true,
                },

                orderBy: {
                    _count: {
                        clientId: "desc",
                    },
                },

                take: 1,
            });

        if (!revisions.length)
            return null;

        const client =
            await prisma.client.findUnique({
                where: {
                    id: revisions[0].clientId,
                },
            });

        return {
            client,
            revisionCount:
                revisions[0]._count.clientId,
        };
    };