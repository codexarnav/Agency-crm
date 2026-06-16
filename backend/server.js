import dotenv from "dotenv";
dotenv.config();

import app from "./src/app.js";
import prisma from "./src/config/prisma.js";
import "./src/workers/publishing.worker.js";

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await prisma.$connect();

        console.log("✅ PostgreSQL Connected");

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