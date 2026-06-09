import express from "express";

import {
    getTaskDashboardStatsController,
    getTasksController,
    updateTaskStatusController
} from "../controllers/task-dashboard.controller.js";

import { verifyToken } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get(
    "/dashboard",
    verifyToken,
    getTaskDashboardStatsController
);

router.get(
    "/",
    verifyToken,
    getTasksController
);

router.patch(
    "/:taskId/status",
    verifyToken,
    updateTaskStatusController
);

export default router;