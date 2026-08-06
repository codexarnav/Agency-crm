import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";

import clientRoutes from "./routes/client.routes.js";
import taskRoutes from "./routes/task.routes.js";
import announcementRoutes from "./routes/announcement.routes.js";
import notificationRoutes from "./routes/notifications.routes.js";
import reportRoutes from "./routes/report.routes.js";
import assetRoutes from "./routes/assets.routes.js";
import approvalRoutes from "./routes/approval.routes.js";
import availabilityRoutes from "./routes/avaliability.routes.js";
import taskDashboardRoutes from "./routes/task-dashboard.js";
import plannerRoutes from "./routes/planner.routes.js";
import activityLogRoutes from "./routes/activity-log.routes.js";
import revisionRoutes from "./routes/revision.routes.js";
import shootRoutes from "./routes/shoot.routes.js";
import publishingRoutes from "./routes/publishing.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import authMetaRoutes from "./routes/authMeta.routes.js";
import authPostProxyRoutes from "./routes/authPostProxy.routes.js";
import socialRoutes from "./routes/social.routes.js";

import upload from "../middleware/upload.middleware.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const app = express();

// Trust reverse proxy headers (Render, Railway, etc.)
// This ensures req.protocol correctly reports 'https' behind the proxy
app.set('trust proxy', 1);

app.use(cors({
    origin: true,
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/auth", authMetaRoutes);
app.use("/auth", authPostProxyRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/task", taskRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/assets", assetRoutes);

app.use("/api/approvals", approvalRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/task-dashboard", taskDashboardRoutes);
app.use("/api/planner", plannerRoutes);
app.use("/api/activity-logs", activityLogRoutes);
app.use("/api/revisions", revisionRoutes);
app.use("/api/shoots", shootRoutes);
app.use("/api/publishing", publishingRoutes);
app.use("/api/settings", settingsRoutes);

app.post("/api/upload", verifyToken, upload.single("file"), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }
        const result = await uploadToCloudinary(req.file.buffer, "agencyflow/uploads");
        return res.status(200).json({
            success: true,
            url: result.secure_url,
        });
    } catch (err) {
        next(err);
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("❌ Error handled by global handler:", err);

    if (err.name === 'MulterError' || err.message.startsWith('file type not supported')) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
});

export default app;