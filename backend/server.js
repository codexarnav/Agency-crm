import dotenv from "dotenv";
dotenv.config();

import app from "./src/app.js";
import prisma from "./src/config/prisma.js";
import { boss, addPublishingJob } from "./src/config/publishingQueue.js";
import { startWorker } from "./src/workers/publishing.worker.js";

const PORT = process.env.PORT || 5000;

async function syncPendingScheduledJobs() {
    try {
        console.log("🔍 Checking for pending scheduled jobs to sync to pg-boss...");
        const scheduledJobs = await prisma.publishingJob.findMany({
            where: {
                status: "SCHEDULED",
            },
        });

        if (scheduledJobs.length === 0) {
            console.log("ℹ️ No pending scheduled jobs found to sync.");
            return;
        }

        console.log(`ℹ️ Found ${scheduledJobs.length} scheduled job(s) in database. Syncing to pg-boss...`);

        let syncCount = 0;
        for (const job of scheduledJobs) {
            const delayMs = job.scheduledAt.getTime() - Date.now();
            // If the scheduled time is in the past, queue immediately (delayMs = 0)
            const activeDelay = Math.max(0, delayMs);
            
            await addPublishingJob(job.id, activeDelay);
            syncCount++;
        }

        console.log(`✅ Successfully synced ${syncCount} scheduled job(s) to pg-boss.`);
    } catch (err) {
        console.error("❌ Failed to sync scheduled jobs on startup:", err);
    }
}

async function startServer() {
    try {
        await prisma.$connect();
        console.log("✅ PostgreSQL Connected");

        // Start pg-boss
        await boss.start();
        console.log("✅ pg-boss queue initialized");

        // Ensure the queue exists
        await boss.createQueue("publishing-jobs");
        console.log("✅ Queue 'publishing-jobs' created/verified");

        // Start the worker process
        await startWorker();

        // Sync existing scheduled jobs
        await syncPendingScheduledJobs();

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("❌ Failed to start server");
        console.error(error);

        process.exit(1);
    }
}

startServer();