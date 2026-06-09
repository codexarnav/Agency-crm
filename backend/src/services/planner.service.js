import prisma from "../config/prisma.js";

// Mapping frontend keys to database Enum values
const PLATFORM_MAP_FE_TO_BE = {
    "Instagram": "INSTAGRAM",
    "Facebook": "FACEBOOK",
    "YouTube": "YOUTUBE",
    "LinkedIn": "LINKEDIN",
    "Twitter/X": "TWITTER",
    "Pinterest": "PINTEREST",
    "Google Ads": "GOOGLE_ADS",
    "Snapchat": "SNAPCHAT",
    "WhatsApp Business": "WHATSAPP_BUSINESS",
    "WhatsApp": "WHATSAPP"
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

const CONTENT_TYPE_MAP_FE_TO_BE = {
    "Reel": "REEL",
    "Short": "SHORT",
    "Static Post": "STATIC_POST",
    "Carousel": "CAROUSEL",
    "Story": "STORY",
    "YouTube Video": "YOUTUBE_VIDEO",
    "Thumbnail": "THUMBNAIL",
    "Caption": "CAPTION",
    "Content Idea": "CONTENT_IDEA",
    "Script": "SCRIPT",
    "Ad Creative": "AD_CREATIVE",
    "Blog Post": "BLOG_POST"
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

const PROD_STATUS_MAP_FE_TO_BE = {
    "todo": "TODO",
    "in_progress": "IN_PROGRESS",
    "ready_for_review": "REVIEW",
    "changes_required": "CHANGES_NEEDED",
    "blocked": "BLOCKED",
    "completed": "COMPLETED"
};

const PROD_STATUS_MAP_BE_TO_FE = {
    "TODO": "todo",
    "IN_PROGRESS": "in_progress",
    "REVIEW": "ready_for_review",
    "CHANGES_NEEDED": "changes_required",
    "BLOCKED": "blocked",
    "COMPLETED": "completed"
};

const APPROV_STATUS_MAP_FE_TO_BE = {
    "pending": "PENDING",
    "manager_approved": "MANAGER_APPROVED",
    "sent_to_client": "SENT_TO_CLIENT",
    "client_approved": "CLIENT_APPROVED",
    "client_rejected": "CHANGES_REQUIRED",
    "final_approved": "FINAL_APPROVED"
};

const APPROV_STATUS_MAP_BE_TO_FE = {
    "PENDING": "pending",
    "MANAGER_APPROVED": "manager_approved",
    "SENT_TO_CLIENT": "sent_to_client",
    "CLIENT_APPROVED": "client_approved",
    "CHANGES_REQUIRED": "client_rejected",
    "FINAL_APPROVED": "final_approved"
};

const PUB_STATUS_MAP_FE_TO_BE = {
    "not_scheduled": "NOT_SCHEDULED",
    "scheduled": "SCHEDULED",
    "posted": "POSTED",
    "failed": "FAILED_TO_POST",
    "rescheduled": "RESCHEDULED"
};

const PUB_STATUS_MAP_BE_TO_FE = {
    "NOT_SCHEDULED": "not_scheduled",
    "SCHEDULED": "scheduled",
    "POSTED": "posted",
    "FAILED_TO_POST": "failed",
    "RESCHEDULED": "rescheduled"
};

const PRIORITY_MAP_FE_TO_BE = {
    "low": "LOW",
    "medium": "MEDIUM",
    "high": "HIGH",
    "urgent": "URGENT"
};

const PRIORITY_MAP_BE_TO_FE = {
    "LOW": "low",
    "MEDIUM": "medium",
    "HIGH": "high",
    "URGENT": "urgent"
};

export const getPlannerTasks = async (companyId, clientId, planMonth) => {
    const tasks = await prisma.task.findMany({
        where: {
            companyId,
            clientId,
            planMonth
        },
        orderBy: {
            postingDate: "asc"
        }
    });

    return tasks.map(task => ({
        id: task.id,
        clientId: task.clientId,
        clientName: task.clientName,
        companyId: task.companyId,
        platform: PLATFORM_MAP_BE_TO_FE[task.platform] || "Instagram",
        postingDate: task.postingDate ? task.postingDate.toISOString().split("T")[0] : "",
        day: task.day || "",
        contentType: CONTENT_TYPE_MAP_BE_TO_FE[task.contentType] || "Reel",
        contentDescription: task.title,
        captionCopy: task.captionCopy || "",
        priority: PRIORITY_MAP_BE_TO_FE[task.priority] || "medium",
        assignedEmployeeId: task.employeeId || "",
        assignedTo: task.assignedToName || "",
        assignmentType: task.assignmentType || "manual",
        internalDeadline: task.dueDate ? task.dueDate.toISOString().split("T")[0] : "",
        productionStatus: PROD_STATUS_MAP_BE_TO_FE[task.productionStatus] || "todo",
        approvalStatus: APPROV_STATUS_MAP_BE_TO_FE[task.approvalStatus] || "pending",
        publishingStatus: PUB_STATUS_MAP_BE_TO_FE[task.publishingStatus] || "not_scheduled",
        contentLink: task.contentLink || "",
        managerNotes: task.managerNotes || "",
        clientFeedback: task.clientFeedback || "",
        revisionCount: task.revisionCount,
        maxRevisions: task.maxRevisions,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
    }));
};

export const savePlannerTasks = async (companyId, managerId, clientId, planMonth, tasksData) => {
    return await prisma.$transaction(async (tx) => {
        // 1. Delete all existing tasks for this client and month
        await tx.task.deleteMany({
            where: {
                companyId,
                clientId,
                planMonth
            }
        });

        const createdTasks = [];

        // 2. Loop and create tasks
        for (const item of tasksData) {
            const platformEnum = PLATFORM_MAP_FE_TO_BE[item.platform] || "INSTAGRAM";
            const contentTypeEnum = CONTENT_TYPE_MAP_FE_TO_BE[item.contentType] || "REEL";
            const priorityEnum = PRIORITY_MAP_FE_TO_BE[item.priority] || "MEDIUM";
            const prodStatusEnum = PROD_STATUS_MAP_FE_TO_BE[item.productionStatus] || "TODO";
            const approvStatusEnum = APPROV_STATUS_MAP_FE_TO_BE[item.approvalStatus] || "PENDING";
            const pubStatusEnum = PUB_STATUS_MAP_FE_TO_BE[item.publishingStatus] || "NOT_SCHEDULED";

            const employeeId = item.assignedEmployeeId && item.assignedEmployeeId.trim() !== "" ? item.assignedEmployeeId : null;

            const task = await tx.task.create({
                data: {
                    companyId,
                    clientId,
                    managerId,
                    employeeId,
                    title: item.contentDescription || `${item.contentType} for ${item.platform}`,
                    description: item.contentDescription || "",
                    platform: platformEnum,
                    contentType: contentTypeEnum,
                    productionStatus: prodStatusEnum,
                    approvalStatus: approvStatusEnum,
                    publishingStatus: pubStatusEnum,
                    priority: priorityEnum,
                    contentLink: item.contentLink || null,
                    dueDate: item.internalDeadline ? new Date(item.internalDeadline) : null,
                    postingDate: item.postingDate ? new Date(item.postingDate) : null,
                    day: item.day || "",
                    captionCopy: item.captionCopy || null,
                    managerNotes: item.managerNotes || null,
                    clientFeedback: item.clientFeedback || null,
                    revisionCount: Number(item.revisionCount) || 0,
                    maxRevisions: Number(item.maxRevisions) || 2,
                    assignmentType: item.assignmentType || "manual",
                    clientName: item.clientName || null,
                    assignedToName: item.assignedTo || null,
                    planMonth
                }
            });

            // Trigger notification to employee if assigned
            if (employeeId) {
                await tx.notification.create({
                    data: {
                        senderId: managerId,
                        receiverId: employeeId,
                        content: `New Task Assigned: ${item.contentType} for ${item.clientName || "Client"} due ${item.internalDeadline || "N/A"}`,
                        type: "TASK_ASSIGNED",
                        isRead: false
                    }
                });
            }

            createdTasks.push(task);
        }

        // Return mapped tasks
        return createdTasks.map(task => ({
            id: task.id,
            clientId: task.clientId,
            clientName: task.clientName,
            companyId: task.companyId,
            platform: PLATFORM_MAP_BE_TO_FE[task.platform] || "Instagram",
            postingDate: task.postingDate ? task.postingDate.toISOString().split("T")[0] : "",
            day: task.day || "",
            contentType: CONTENT_TYPE_MAP_BE_TO_FE[task.contentType] || "Reel",
            contentDescription: task.title,
            captionCopy: task.captionCopy || "",
            priority: PRIORITY_MAP_BE_TO_FE[task.priority] || "medium",
            assignedEmployeeId: task.employeeId || "",
            assignedTo: task.assignedToName || "",
            assignmentType: task.assignmentType || "manual",
            internalDeadline: task.dueDate ? task.dueDate.toISOString().split("T")[0] : "",
            productionStatus: PROD_STATUS_MAP_BE_TO_FE[task.productionStatus] || "todo",
            approvalStatus: APPROV_STATUS_MAP_BE_TO_FE[task.approvalStatus] || "pending",
            publishingStatus: PUB_STATUS_MAP_BE_TO_FE[task.publishingStatus] || "not_scheduled",
            contentLink: task.contentLink || "",
            managerNotes: task.managerNotes || "",
            clientFeedback: task.clientFeedback || "",
            revisionCount: task.revisionCount,
            maxRevisions: task.maxRevisions,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        }));
    });
};
