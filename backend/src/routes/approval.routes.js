import express from "express";

import {
    getApprovalDashboardController,
    getApprovalQueueController,
    managerApproveTaskController,
    sendTaskToClientController,
    clientApproveTaskController,
    clientRequestChangesController,
} from "../controllers/approval.controller.js";

import {
    verifyToken,
    authorizeRoles,
} from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get(
    "/dashboard",
    verifyToken,
    getApprovalDashboardController
);

router.get(
    "/",
    verifyToken,
    getApprovalQueueController
);

router.patch(
    "/:taskId/manager-approve",
    verifyToken,
    authorizeRoles(
        "MANAGER",
        "SUPER_ADMIN"
    ),
    managerApproveTaskController
);

router.patch(
    "/:taskId/send-client",
    verifyToken,
    authorizeRoles(
        "MANAGER",
        "SUPER_ADMIN"
    ),
    sendTaskToClientController
);

router.patch(
    "/:taskId/client-approve",
    verifyToken,
    clientApproveTaskController
);

router.patch(
    "/:taskId/request-changes",
    verifyToken,
    clientRequestChangesController
);

export default router;