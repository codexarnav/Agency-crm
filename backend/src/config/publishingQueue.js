import { PgBoss } from "pg-boss";
import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production" ||
    (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost"));

export const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

boss.on("error", (error) => console.error("pg-boss error:", error));

export const addPublishingJob = async (publishingJobId, delayMs) => {
  const delayInSeconds = Math.max(0, Math.ceil(delayMs / 1000));
  console.log(`[Queue] Queueing pg-boss job for ID: ${publishingJobId} with delay: ${delayInSeconds}s`);
  return await boss.send(
    "publishing-jobs",
    { publishingJobId },
    {
      startAfter: delayInSeconds,
      singletonKey: String(publishingJobId),
      retryLimit: 3,
      retryDelay: 5, // 5 seconds between retries
      retryBackoff: true,
    }
  );
};
