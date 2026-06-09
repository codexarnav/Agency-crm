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
const app = express();

const allowedOrigins = [
    "http://localhost:5173",
    process.env.FRONTEND_URL,
];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow Postman and server-to-server requests
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(
                new Error("Not allowed by CORS")
            );
        },
        credentials: true,
        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS",
        ],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
        ],
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
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
export default app;