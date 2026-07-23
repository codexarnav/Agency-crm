import prisma from "../config/prisma.js";
import { createNotification } from "./notifications.service.js";
import { addPublishingJob } from "../config/publishingQueue.js";
import { deletePost as deletePostFromProxy } from "./postproxy.service.js";

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
    const { taskId, shootId, platform, platforms, caption, mediaUrls, scheduledAt, postNow } = data;

    if (!taskId && !shootId && !data.clientId) {
        throw new Error("Client selection, taskId, or shootId is required to schedule a post");
    }

    if (!platform && (!platforms || platforms.length === 0)) {
        throw new Error("Platform(s) selection is required");
    }

    let companyId = loggedInUser.companyId;
    let clientId = data.clientId || null;
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

    // 1. Social connection validation before scheduling
    const socialConns = await prisma.socialConnection.findMany({
        where: { clientId },
    });

    if (socialConns.length === 0) {
        throw new Error("This client has not connected any social media profiles. Please connect accounts first.");
    }

    const targetPlatforms = Array.isArray(platforms) ? platforms : (platform ? [platform] : []);
    if (targetPlatforms.length === 0) {
        throw new Error("At least one platform must be selected");
    }

    const connectedPlatforms = socialConns.map(c => c.platform.toLowerCase());
    for (const p of targetPlatforms) {
        if (!connectedPlatforms.includes(p.toLowerCase())) {
            throw new Error(`Platform ${p} is not connected for this client`);
        }
    }

    const createdJobs = [];
    const isImmediate = postNow || !scheduledAt;
    const scheduleDateObj = isImmediate ? new Date() : new Date(scheduledAt);
    const delayMs = isImmediate ? 0 : Math.max(0, scheduleDateObj.getTime() - Date.now());

    // Create a publishing job for each selected platform
    for (const p of targetPlatforms) {
        const job = await prisma.publishingJob.create({
            data: {
                companyId,
                clientId,
                managerId: loggedInUser.id,
                taskId: taskId || null,
                shootId: shootId || null,
                platform: p.toUpperCase(),
                caption: caption || null,
                mediaUrls: Array.isArray(mediaUrls) ? mediaUrls.join(",") : (mediaUrls || ""),
                scheduledAt: scheduleDateObj,
                status: "SCHEDULED",
                platforms: targetPlatforms.map(pt => pt.toUpperCase()),
            },
            include: {
                task: true,
                shoot: true,
                client: true,
                manager: true,
            },
        });

        // Add to BullMQ / PgBoss Queue
        await addPublishingJob(job.id, delayMs);
        createdJobs.push(job);
    }

    // Sync task publishing status if task is linked
    if (taskId) {
        await prisma.task.update({
            where: { id: taskId },
            data: {
                publishingStatus: "SCHEDULED",
                scheduleDateTime: scheduleDateObj,
                selectedPlatforms: targetPlatforms.map(pt => pt.toUpperCase()),
                publishError: null,
            },
        });
    }

    // Notify assignee (using the first job created as reference)
    if (createdJobs.length > 0) {
        const itemTitle = task ? task.title : (shoot ? shoot.title : "Content");
        await notifyAssignee(
            createdJobs[0],
            "PUBLISHING_SCHEDULED",
            `Post "${itemTitle}" has been scheduled for publishing on ${targetPlatforms.join(", ")} at ${scheduleDateObj.toLocaleString()}`,
            loggedInUser.id
        );
    }

    // Return the first job or all of them depending on API expectation
    return createdJobs[0];
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

/**
 * Retry a failed publishing job
 */
export const retryPublishingJob = async (id, companyId, loggedInUser) => {
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
            status: "SCHEDULED",
            attempts: 0,
            lastError: null,
            failureReason: null,
        },
        include: {
            client: true,
            task: true,
            shoot: true,
            manager: true,
        },
    });

    if (job.taskId) {
        await prisma.task.update({
            where: { id: job.taskId },
            data: {
                publishingStatus: "SCHEDULED",
                publishError: null,
            },
        });
    }

    // Trigger immediately
    await addPublishingJob(updatedJob.id, 0);

    return updatedJob;
};

/**
 * Get client's social connection status
 */
export const getSocialStatus = async (clientId, companyId) => {
    const client = await prisma.client.findFirst({
        where: { id: clientId, companyId },
    });

    if (!client) {
        throw new Error("Client not found");
    }

    const socialConns = await prisma.socialConnection.findMany({
        where: { clientId },
    });

    const facebookConn = socialConns.find(c => c.platform.toLowerCase() === "facebook");
    const instagramConn = socialConns.find(c => c.platform.toLowerCase() === "instagram");
    const twitterConn = socialConns.find(c => c.platform.toLowerCase() === "twitter");
    const linkedinConn = socialConns.find(c => c.platform.toLowerCase() === "linkedin");
    const youtubeConn = socialConns.find(c => c.platform.toLowerCase() === "youtube");
    const tiktokConn = socialConns.find(c => c.platform.toLowerCase() === "tiktok");

    return {
        connectedPlatforms: socialConns.map(c => c.platform.toLowerCase()),
        clientName: client.companyName || client.brandName || "Client",
        connected: socialConns.length > 0,
        facebookConnected: !!facebookConn,
        instagramConnected: !!instagramConn,
        twitterConnected: !!twitterConn,
        linkedinConnected: !!linkedinConn,
        youtubeConnected: !!youtubeConn,
        tiktokConnected: !!tiktokConn,
        facebookPageName: facebookConn ? facebookConn.profileName : null,
        instagramUsername: instagramConn ? instagramConn.profileName : null,
        twitterUsername: twitterConn ? twitterConn.profileName : null,
        linkedinUsername: linkedinConn ? linkedinConn.profileName : null,
        youtubeUsername: youtubeConn ? youtubeConn.profileName : null,
        tiktokUsername: tiktokConn ? tiktokConn.profileName : null,
    };
};

/**
 * Delete a publishing job (and delete from Facebook if already published)
 */
export const deletePublishingJob = async (id, companyId, loggedInUser) => {
    const job = await prisma.publishingJob.findFirst({
        where: { id, companyId },
        include: {
            task: true,
            shoot: true,
            client: true,
        },
    });

    if (!job) {
        throw new Error("Publishing job not found");
    }

    if (loggedInUser && loggedInUser.role === "MANAGER" && job.managerId !== loggedInUser.id) {
        throw new Error("Access denied: You do not own this publishing job");
    }

    // If already published and we have an external post ID, delete from PostProxy (which deletes from the platform)
    if (job.status === "PUBLISHED" && job.externalPostId) {
        try {
            console.log(`Attempting to delete post ${job.externalPostId} via PostProxy API`);
            await deletePostFromProxy(job.externalPostId, true);
            console.log(`Successfully requested deletion for post ${job.externalPostId} on platform`);
        } catch (err) {
            console.error("Error attempting to delete post via PostProxy:", err);
        }
    }

    // Delete the job from database
    const deletedJob = await prisma.publishingJob.delete({
        where: { id },
    });

    // Update task status if linked
    if (job.taskId) {
        await prisma.task.update({
            where: { id: job.taskId },
            data: {
                publishingStatus: "NOT_SCHEDULED",
                publishedAt: null,
                publishError: null,
            },
        });
    }

    return deletedJob;
};


