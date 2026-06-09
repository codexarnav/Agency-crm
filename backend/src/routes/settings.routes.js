import express from "express";
import {
    getCompanySettings,
    updateCompanySettings,
    getPermissionsSettings,
    updatePermissionsSettings,
    getPublishingSettings,
    connectPublishingPlatform,
    disconnectPublishingPlatform,
    getNotificationsSettings,
    updateNotificationsSettings
} from "../controllers/settings.controller.js";
import { verifyToken, authorizeRoles } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/company", verifyToken, authorizeRoles("SUPER_ADMIN"), getCompanySettings);
router.put("/company", verifyToken, authorizeRoles("SUPER_ADMIN"), updateCompanySettings);

router.get("/permissions", verifyToken, authorizeRoles("SUPER_ADMIN"), getPermissionsSettings);
router.put("/permissions", verifyToken, authorizeRoles("SUPER_ADMIN"), updatePermissionsSettings);

router.get("/publishing", verifyToken, authorizeRoles("SUPER_ADMIN"), getPublishingSettings);
router.post("/publishing/connect", verifyToken, authorizeRoles("SUPER_ADMIN"), connectPublishingPlatform);
router.delete("/publishing/disconnect", verifyToken, authorizeRoles("SUPER_ADMIN"), disconnectPublishingPlatform);

router.get("/notifications", verifyToken, authorizeRoles("SUPER_ADMIN"), getNotificationsSettings);
router.put("/notifications", verifyToken, authorizeRoles("SUPER_ADMIN"), updateNotificationsSettings);

export default router;
