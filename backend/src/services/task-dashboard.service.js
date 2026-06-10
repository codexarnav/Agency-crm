import prisma from "../config/prisma.js";

export const getTaskDashboardStats =
    async (companyId, managerId = null) => {

        const now = new Date();
        const whereClause = { companyId };
        if (managerId) {
            whereClause.managerId = managerId;
        }

        const total =
            await prisma.task.count({
                where: whereClause
            });

        const inProduction =
            await prisma.task.count({
                where: {
                    ...whereClause,
                    productionStatus: "IN_PROGRESS"
                }
            });

        const inReview =
            await prisma.task.count({
                where: {
                    ...whereClause,
                    productionStatus: "REVIEW"
                }
            });

        const approved =
            await prisma.task.count({
                where: {
                    ...whereClause,
                    approvalStatus: "FINAL_APPROVED"
                }
            });

        const blocked =
            await prisma.task.count({
                where: {
                    ...whereClause,
                    productionStatus: "BLOCKED"
                }
            });

        const overdue =
            await prisma.task.count({
                where: {
                    ...whereClause,
                    dueDate: {
                        lt: now
                    },
                    publishingStatus: {
                        not: "POSTED"
                    }
                }
            });

        return {
            total,
            inProduction,
            inReview,
            approved,
            blocked,
            overdue
        };
    };

const PLATFORM_MAP_BE_TO_FE = {
    "INSTAGRAM": "Instagram",
    "FACEBOOK": "Facebook",
    "YOUTUBE": "YouTube",
    "LINKEDIN": "LinkedIn",
    "TWITTER": "Twitter/X",
    "PINTEREST": "Pinterest",
    "GOOGLE_ADS": "Google Ads",
    "SNAPCHAT": "Snapchat",
    "WHATSAPP_BUSINESS": "WhatsApp Business",
    "WHATSAPP": "WhatsApp Business"
};

const CONTENT_TYPE_MAP_BE_TO_FE = {
    "REEL": "Reel",
    "SHORT": "Short",
    "STATIC_POST": "Static Post",
    "CAROUSEL": "Carousel",
    "STORY": "Story",
    "YOUTUBE_VIDEO": "YouTube Video",
    "THUMBNAIL": "Thumbnail",
    "CAPTION": "Caption",
    "CONTENT_IDEA": "Content Idea",
    "SCRIPT": "Script",
    "AD_CREATIVE": "Ad Creative",
    "BLOG_POST": "Blog Post"
};

const PROD_STATUS_MAP_BE_TO_FE = {
    "TODO": "todo",
    "IN_PROGRESS": "in_progress",
    "REVIEW": "ready_for_review",
    "CHANGES_NEEDED": "changes_required",
    "BLOCKED": "blocked",
    "COMPLETED": "completed"
};

const APPROV_STATUS_MAP_BE_TO_FE = {
    "PENDING": "pending",
    "MANAGER_APPROVED": "manager_approved",
    "SENT_TO_CLIENT": "sent_to_client",
    "CLIENT_APPROVED": "client_approved",
    "CHANGES_REQUIRED": "client_rejected",
    "FINAL_APPROVED": "final_approved"
};

const PUB_STATUS_MAP_BE_TO_FE = {
    "NOT_SCHEDULED": "not_scheduled",
    "SCHEDULED": "scheduled",
    "POSTED": "posted",
    "FAILED_TO_POST": "failed",
    "RESCHEDULED": "rescheduled"
};

const PRIORITY_MAP_BE_TO_FE = {
    "LOW": "low",
    "MEDIUM": "medium",
    "HIGH": "high",
    "URGENT": "urgent"
};

export const getTasks =
    async (companyId, employeeId = null, clientId = null, managerId = null) => {

        const whereClause = { companyId };
        if (employeeId) {
            whereClause.employeeId = employeeId;
        }
        if (clientId) {
            whereClause.clientId = clientId;
        }
        if (managerId) {
            whereClause.managerId = managerId;
        }

        const tasks = await prisma.task.findMany({
            where: whereClause,

            include: {
                client: {
                    select: {
                        companyName: true
                    }
                },

                employee: {
                    select: {
                        username: true
                    }
                }
            },

            orderBy: {
                createdAt: "desc"
            }
        });

        const enhancedTasks = await Promise.all(
            tasks.map(async (task) => {
                let shootScript = null;
                let dynamicContentLink = task.contentLink || "";

                if (task.description && task.description.includes("[Shoot Script ID:")) {
                    const match = task.description.match(/\[Shoot Script ID:\s*([a-fA-F0-9-]+)\]/);
                    if (match && match[1]) {
                        const shootId = match[1];
                        shootScript = await prisma.shootScript.findFirst({
                            where: {
                                shootId: shootId,
                                employeeId: task.employeeId || undefined,
                            },
                        });
                        if (shootScript && shootScript.scriptFileUrl) {
                            dynamicContentLink = task.contentLink || shootScript.scriptFileUrl;
                        }
                    }
                }

                return {
                    id: task.id,
                    clientId: task.clientId,
                    clientName: task.clientName || task.client?.companyName || "",
                    companyId: task.companyId,
                    platform: PLATFORM_MAP_BE_TO_FE[task.platform] || "Instagram",
                    postingDate: task.postingDate ? task.postingDate.toISOString().split("T")[0] : "",
                    day: task.day || "",
                    contentType: CONTENT_TYPE_MAP_BE_TO_FE[task.contentType] || "Reel",
                    contentDescription: task.title,
                    captionCopy: task.captionCopy || "",
                    priority: PRIORITY_MAP_BE_TO_FE[task.priority] || "medium",
                    assignedEmployeeId: task.employeeId || "",
                    assignedTo: task.assignedToName || task.employee?.username || "",
                    assignmentType: task.assignmentType || "manual",
                    internalDeadline: task.dueDate ? task.dueDate.toISOString().split("T")[0] : "",
                    productionStatus: PROD_STATUS_MAP_BE_TO_FE[task.productionStatus] || "todo",
                    approvalStatus: APPROV_STATUS_MAP_BE_TO_FE[task.approvalStatus] || "pending",
                    publishingStatus: PUB_STATUS_MAP_BE_TO_FE[task.publishingStatus] || "not_scheduled",
                    contentLink: dynamicContentLink,
                    shootScript: shootScript,
                    managerNotes: task.managerNotes || "",
                    clientFeedback: task.clientFeedback || "",
                    revisionCount: task.revisionCount,
                    maxRevisions: task.maxRevisions,
                    progress: task.progress || 0,
                    createdAt: task.createdAt,
                    updatedAt: task.updatedAt
                };
            })
        );

        return enhancedTasks;
    };

export const updateTaskStatus =
    async (
        taskId,
        updates
    ) => {
        const data = { ...updates };

        if (data.productionStatus) {
            const PROD_STATUS_MAP = {
                "todo": "TODO",
                "in_progress": "IN_PROGRESS",
                "ready_for_review": "REVIEW",
                "changes_required": "CHANGES_NEEDED",
                "blocked": "BLOCKED",
                "completed": "COMPLETED"
            };
            const mapped = PROD_STATUS_MAP[data.productionStatus];
            if (mapped) data.productionStatus = mapped;
        }

        if (data.approvalStatus) {
            const APPROV_STATUS_MAP = {
                "pending": "PENDING",
                "manager_approved": "MANAGER_APPROVED",
                "sent_to_client": "SENT_TO_CLIENT",
                "client_approved": "CLIENT_APPROVED",
                "client_rejected": "CHANGES_REQUIRED",
                "final_approved": "FINAL_APPROVED"
            };
            const mapped = APPROV_STATUS_MAP[data.approvalStatus];
            if (mapped) data.approvalStatus = mapped;
        }

        if (data.publishingStatus) {
            const PUB_STATUS_MAP = {
                "not_scheduled": "NOT_SCHEDULED",
                "scheduled": "SCHEDULED",
                "posted": "POSTED",
                "failed": "FAILED_TO_POST",
                "rescheduled": "RESCHEDULED"
            };
            const mapped = PUB_STATUS_MAP[data.publishingStatus];
            if (mapped) data.publishingStatus = mapped;
        }

        return await prisma.task.update({
            where: {
                id: taskId
            },

            data
        });
    };