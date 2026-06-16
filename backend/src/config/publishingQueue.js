import { Queue } from "bullmq";
import { redisConnection } from "./redisConnection.js";

export const publishingQueue = new Queue("publishing-jobs", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const addPublishingJob = async (publishingJobId, delayMs) => {
  return await publishingQueue.add(
    "publish",
    { publishingJobId },
    { delay: Math.max(0, delayMs) }
  );
};
