import { Worker } from "bullmq";
import prisma from "../config/prisma.js";
import { redisConnection } from "../config/redisConnection.js";
import { publishPost } from "../services/postproxy.service.js";
import { createNotification } from "../services/notifications.service.js";

const worker = new Worker(
  "publishing-jobs",
  async (job) => {
    const { publishingJobId } = job.data;
    console.log(`Processing BullMQ job: ${job.id} for PublishingJob ID: ${publishingJobId}`);

    // 1. Fetch PublishingJob
    const pubJob = await prisma.publishingJob.findUnique({
      where: { id: publishingJobId },
      include: {
        task: true,
        shoot: true,
        client: true,
      },
    });

    if (!pubJob) {
      console.error(`PublishingJob not found: ${publishingJobId}`);
      return;
    }

    if (pubJob.status === "PUBLISHED") {
      console.log(`PublishingJob ${publishingJobId} is already PUBLISHED. Skipping.`);
      return;
    }

    // 2. Set statuses to PUBLISHING
    await prisma.publishingJob.update({
      where: { id: publishingJobId },
      data: {
        status: "PUBLISHING",
        processedAt: new Date(),
      },
    });

    if (pubJob.taskId) {
      await prisma.task.update({
        where: { id: pubJob.taskId },
        data: {
          publishingStatus: "PUBLISHING",
        },
      });
    }

    try {
      const socialConn = await prisma.socialConnection.findFirst({
        where: {
          clientId: pubJob.clientId,
          platform: pubJob.platform.toLowerCase()
        }
      });
      if (!socialConn) {
        throw new Error(`Client "${pubJob.client.companyName}" has no connected profile for platform "${pubJob.platform}"`);
      }

      // Check the media link
      let imageUrl = pubJob.mediaUrls ? pubJob.mediaUrls.split(",")[0] : null;
      if (!imageUrl) {
        if (pubJob.task && pubJob.task.contentLink) {
          imageUrl = pubJob.task.contentLink;
        } else if (pubJob.shoot && pubJob.shoot.shootDraftUrl) {
          imageUrl = pubJob.shoot.shootDraftUrl;
        }
      }

      const caption = pubJob.caption || (pubJob.task ? pubJob.task.title : (pubJob.shoot ? pubJob.shoot.title : ""));

      let externalPostId = null;

      console.log(`Publishing to PostProxy using profile ID: ${socialConn.postproxyProfileId} for platform ${pubJob.platform}`);
      const result = await publishPost(
        [socialConn.postproxyProfileId],
        caption,
        imageUrl ? [imageUrl] : []
      );
      externalPostId = result.id;

      // 3. Success Path
      await prisma.publishingJob.update({
        where: { id: publishingJobId },
        data: {
          status: "PUBLISHED",
          externalPostId,
          publishedAt: new Date(),
          attempts: job.attemptsMade + 1,
          lastError: null,
        },
      });

      if (pubJob.taskId) {
        const currentTask = await prisma.task.findUnique({ where: { id: pubJob.taskId } });
        let metaPostIds = {};
        if (currentTask.metaPostIds && typeof currentTask.metaPostIds === "object" && !Array.isArray(currentTask.metaPostIds)) {
          metaPostIds = { ...currentTask.metaPostIds };
        }
        metaPostIds[platformName.toLowerCase()] = externalPostId;

        await prisma.task.update({
          where: { id: pubJob.taskId },
          data: {
            publishingStatus: "PUBLISHED",
            publishedAt: new Date(),
            publishError: null,
            metaPostIds,
          },
        });
      }

      // Notify manager and employee
      const itemTitle = pubJob.task ? pubJob.task.title : (pubJob.shoot ? pubJob.shoot.title : "Content");
      
      // Notify manager
      await createNotification({
        senderId: pubJob.managerId,
        receiverId: pubJob.managerId,
        type: "POST_PUBLISHED",
        content: `Successfully published "${itemTitle}" on ${pubJob.platform} for client "${pubJob.client.companyName}"`,
      }).catch(err => console.error("Notification failed:", err));

      // Notify employee/assignee if exists and is different from manager
      const assigneeId = pubJob.task?.employeeId || pubJob.shoot?.creativeLeadId;
      if (assigneeId && assigneeId !== pubJob.managerId) {
        await createNotification({
          senderId: pubJob.managerId,
          receiverId: assigneeId,
          type: "POST_PUBLISHED",
          content: `Successfully published "${itemTitle}" on ${pubJob.platform} for client "${pubJob.client.companyName}"`,
        }).catch(err => console.error("Notification failed:", err));
      }

      console.log(`Successfully completed publishing job for ID ${publishingJobId}`);
      return { success: true, externalPostId };

    } catch (error) {
      console.error(`Error executing publishing job ${publishingJobId}:`, error);

      const maxAttempts = job.opts.attempts || 3;
      const isLastAttempt = (job.attemptsMade + 1) >= maxAttempts;

      // Update publishing job in DB with failure details
      await prisma.publishingJob.update({
        where: { id: publishingJobId },
        data: {
          attempts: job.attemptsMade + 1,
          lastError: error.message,
          failureReason: error.message,
          status: isLastAttempt ? "FAILED" : "SCHEDULED", // Revert to SCHEDULED for BullMQ retry
        },
      });

      if (pubJob.taskId) {
        await prisma.task.update({
          where: { id: pubJob.taskId },
          data: {
            publishingStatus: isLastAttempt ? "FAILED" : "SCHEDULED",
            publishError: error.message,
            publishingAttempts: job.attemptsMade + 1,
          },
        });
      }

      if (isLastAttempt) {
        // Notify manager and assignee on final failure
        const itemTitle = pubJob.task ? pubJob.task.title : (pubJob.shoot ? pubJob.shoot.title : "Content");
        
        await createNotification({
          senderId: pubJob.managerId,
          receiverId: pubJob.managerId,
          type: "POST_PUBLISH_FAILED",
          content: `Failed to publish "${itemTitle}" on ${pubJob.platform} for client "${pubJob.client.companyName}": ${error.message}`,
        }).catch(err => console.error("Notification failed:", err));

        const assigneeId = pubJob.task?.employeeId || pubJob.shoot?.creativeLeadId;
        if (assigneeId && assigneeId !== pubJob.managerId) {
          await createNotification({
            senderId: pubJob.managerId,
            receiverId: assigneeId,
            type: "POST_PUBLISH_FAILED",
            content: `Failed to publish "${itemTitle}" on ${pubJob.platform} for client "${pubJob.client.companyName}": ${error.message}`,
          }).catch(err => console.error("Notification failed:", err));
        }
      }

      // Rethrow to trigger BullMQ retry mechanism
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  console.log(`BullMQ Job ${job.id} completed successfully.`);
});

worker.on("failed", (job, err) => {
  console.error(`BullMQ Job ${job ? job.id : "unknown"} failed:`, err);
});

console.log("Publishing Automation Worker is running and listening for jobs...");

export default worker;
