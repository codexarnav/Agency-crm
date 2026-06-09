import prisma from "../config/prisma.js";
import { createNotification } from "./notifications.service.js";

// Helper to notify the assigned employee or creative lead
const notifyAssignee = async (job, type, content, senderId) => {
    try {
        let receiverId = null;
        if (job.task && job.task.employeeId) {
            receiverId = job.task.employeeId;
        } else if (job.shoot && job.shoot.creativeLeadId) {
            receiverId = job.shoot.creativeLeadId;
        }

        if (receiverId && receiverId !== senderId) {
            await createNotification({
                senderId,
                receiverId,
                type,
                content,
            });
        }
    } catch (err) {
        console.error("Failed to send publishing notification:", err);
    }
};

/**
 * Schedule a new publishing job
 */
export const schedulePost = async (data, loggedInUser) => {
    const { taskId, shootId, platform, caption, mediaUrls, scheduledAt } = data;

    if (!taskId && !shootId) {
        throw new Error("Either taskId or shootId must be provided to schedule a post");
    }

    if (!platform) {
        throw new Error("Platform is required");
    }

    if (!scheduledAt) {
        throw new Error("Scheduled date and time are required");
    }

    let companyId = loggedInUser.companyId;
    let clientId = null;
    let task = null;
    let shoot = null;

    if (taskId) {
        task = await prisma.task.findFirst({
            where: { id: taskId, companyId },
        });
        if (!task) {
            throw new Error("Task not found");
        }
        // Validates task approval status (Task must be FINAL_APPROVED or CLIENT_APPROVED)
        const validStatuses = ["FINAL_APPROVED", "CLIENT_APPROVED"];
        if (!validStatuses.includes(task.approvalStatus)) {
            throw new Error(`Task must be approved by the client or final approved to schedule. Current status: ${task.approvalStatus}`);
        }
        clientId = task.clientId;
    }

    if (shootId) {
        shoot = await prisma.shoot.findFirst({
            where: { id: shootId, companyId },
        });
        if (!shoot) {
            throw new Error("Shoot not found");
        }
        // Validates shoot status (must be READY_FOR_REVIEW, CLIENT_APPROVAL, COMPLETED, or PUBLISHED)
        const validShootStatuses = ["READY_FOR_REVIEW", "CLIENT_APPROVAL", "COMPLETED", "PUBLISHED"];
        if (!validShootStatuses.includes(shoot.status)) {
            throw new Error(`Shoot status must be ready for review, client approval, completed, or published. Current status: ${shoot.status}`);
        }
        if (!clientId) {
            clientId = shoot.clientId;
        }
    }

    if (!clientId) {
        throw new Error("Client ID could not be determined");
    }

    // Create the publishing job
    const job = await prisma.publishingJob.create({
        data: {
            companyId,
            clientId,
            managerId: loggedInUser.id,
            taskId: taskId || null,
            shootId: shootId || null,
            platform,
            caption: caption || null,
            mediaUrls: Array.isArray(mediaUrls) ? mediaUrls.join(",") : (mediaUrls || ""),
            scheduledAt: new Date(scheduledAt),
            status: "SCHEDULED",
        },
        include: {
            task: true,
            shoot: true,
            client: true,
            manager: true,
        },
    });

    // Sync task publishing status if task is linked
    if (taskId) {
        await prisma.task.update({
            where: { id: taskId },
            data: {
                publishingStatus: "SCHEDULED",
                scheduleDateTime: new Date(scheduledAt),
            },
        });
    }

    // Notify assignee
    const itemTitle = task ? task.title : (shoot ? shoot.title : "Content");
    await notifyAssignee(
        job,
        "PUBLISHING_SCHEDULED",
        `Post "${itemTitle}" has been scheduled for publishing on ${platform} at ${new Date(scheduledAt).toLocaleString()}`,
        loggedInUser.id
    );

    return job;
};

/**
 * Fetch the publishing queue with filtering
 */
export const getPublishingQueue = async (companyId, filters = {}) => {
    const { status, platform, clientId, search, managerId } = filters;
    const where = { companyId };
    if (managerId) {
        where.managerId = managerId;
    }

    if (status) {
        where.status = status;
    }
    if (platform) {
        where.platform = platform;
    }
    if (clientId) {
        where.clientId = clientId;
    }

    if (search && search.trim() !== "") {
        const query = search.trim();
        where.OR = [
            { caption: { contains: query, mode: "insensitive" } },
            {
                client: {
                    companyName: { contains: query, mode: "insensitive" },
                },
            },
            {
                task: {
                    title: { contains: query, mode: "insensitive" },
                },
            },
            {
                shoot: {
                    title: { contains: query, mode: "insensitive" },
                },
            },
        ];
    }

    const queue = await prisma.publishingJob.findMany({
        where,
        include: {
            client: true,
            task: true,
            shoot: true,
            manager: true,
        },
        orderBy: {
            scheduledAt: "asc", // Show soonest scheduled jobs first in queue
        },
    });

    return queue;
};

/**
 * Fetch calendar-view publishing jobs
 */
export const getPublishingCalendar = async (companyId, startDate, endDate, managerId = null) => {
    const where = { companyId };
    if (managerId) {
        where.managerId = managerId;
    }

    if (startDate && endDate) {
        where.scheduledAt = {
            gte: new Date(startDate),
            lte: new Date(endDate),
        };
    }

    const jobs = await prisma.publishingJob.findMany({
        where,
        include: {
            client: true,
            task: true,
            shoot: true,
            manager: true,
        },
        orderBy: {
            scheduledAt: "asc",
        },
    });

    return jobs;
};

/**
 * Reschedule an existing publishing job
 */
export const reschedulePost = async (id, companyId, scheduledAt, loggedInUser) => {
    if (!scheduledAt) {
        throw new Error("New scheduled date/time is required");
    }

    const job = await prisma.publishingJob.findFirst({
        where: { id, companyId },
        include: {
            task: true,
            shoot: true,
        },
    });

    if (!job) {
        throw new Error("Publishing job not found");
    }

    if (loggedInUser && loggedInUser.role === "MANAGER" && job.managerId !== loggedInUser.id) {
        throw new Error("Access denied: You do not own this publishing job");
    }

    const updatedJob = await prisma.publishingJob.update({
        where: { id },
        data: {
            scheduledAt: new Date(scheduledAt),
            status: "RESCHEDULED",
        },
        include: {
            client: true,
            task: true,
            shoot: true,
            manager: true,
        },
    });

    // Update the task date and status if linked
    if (job.taskId) {
        await prisma.task.update({
            where: { id: job.taskId },
            data: {
                publishingStatus: "RESCHEDULED",
                scheduleDateTime: new Date(scheduledAt),
            },
        });
    }

    // Notify assignee
    const itemTitle = job.task ? job.task.title : (job.shoot ? job.shoot.title : "Content");
    await notifyAssignee(
        updatedJob,
        "PUBLISHING_RESCHEDULED",
        `Post "${itemTitle}" has been rescheduled to ${new Date(scheduledAt).toLocaleString()}`,
        loggedInUser.id
    );

    return updatedJob;
};

/**
 * Cancel a publishing job
 */
export const cancelPost = async (id, companyId, loggedInUser) => {
    const job = await prisma.publishingJob.findFirst({
        where: { id, companyId },
        include: {
            task: true,
            shoot: true,
        },
    });

    if (!job) {
        throw new Error("Publishing job not found");
    }

    if (loggedInUser && loggedInUser.role === "MANAGER" && job.managerId !== loggedInUser.id) {
        throw new Error("Access denied: You do not own this publishing job");
    }

    const updatedJob = await prisma.publishingJob.update({
        where: { id },
        data: {
            status: "CANCELLED",
        },
        include: {
            client: true,
            task: true,
            shoot: true,
            manager: true,
        },
    });

    // Update task status if linked
    if (job.taskId) {
        await prisma.task.update({
            where: { id: job.taskId },
            data: {
                publishingStatus: "CANCELLED",
            },
        });
    }

    // Notify assignee
    const itemTitle = job.task ? job.task.title : (job.shoot ? job.shoot.title : "Content");
    await notifyAssignee(
        updatedJob,
        "PUBLISHING_CANCELLED",
        `Scheduled post for "${itemTitle}" has been CANCELLED`,
        loggedInUser.id
    );

    return updatedJob;
};

/**
 * Fetch detailed publishing job by ID
 */
export const getPublishingJobById = async (id, companyId, loggedInUser = null) => {
    const job = await prisma.publishingJob.findFirst({
        where: { id, companyId },
        include: {
            client: true,
            task: true,
            shoot: true,
            manager: true,
        },
    });

    if (!job) {
        throw new Error("Publishing job not found");
    }

    if (loggedInUser && loggedInUser.role === "MANAGER" && job.managerId !== loggedInUser.id) {
        throw new Error("Access denied: You do not own this publishing job");
    }

    return job;
};
