import express from "express";
import { verifyToken, authorizeRoles } from "../../middleware/auth.middleware.js";
import upload from "../../middleware/upload.middleware.js";
import {
  createShootBriefController,
  getAllShootsController,
  getShootByIdController,
  scheduleShootController,
  updateShootStatusController,
  createScriptDraftController,
  submitScriptController,
  approveScriptController,
  requestScriptChangesController,
  assignCrewMembersController,
  getCrewController,
  uploadShootAssetController,
  getShootAssetsController,
  deleteShootAssetController,
  generateEditingTasksController,
  submitShootDraftController
} from "../controllers/shoot.controller.js";

const router = express.Router();

// General Shoots endpoints
router.post(
  "/",
  verifyToken,
  authorizeRoles("SUPER_ADMIN", "MANAGER", "ACCOUNT_MANAGER"),
  createShootBriefController
);

router.get("/", verifyToken, getAllShootsController);

router.get("/:id", verifyToken, getShootByIdController);

router.patch(
  "/:id/schedule",
  verifyToken,
  authorizeRoles("SUPER_ADMIN", "MANAGER"),
  scheduleShootController
);

router.patch("/:id/status", verifyToken, updateShootStatusController);

// Crew endpoints
router.post(
  "/:id/crew",
  verifyToken,
  authorizeRoles("SUPER_ADMIN", "MANAGER"),
  assignCrewMembersController
);

router.get("/:id/crew", verifyToken, getCrewController);

// Script endpoints
router.post(
  "/:id/script/draft",
  verifyToken,
  authorizeRoles("EMPLOYEE"),
  upload.single("scriptFile"),
  createScriptDraftController
);

router.post(
  "/:id/script/submit",
  verifyToken,
  authorizeRoles("EMPLOYEE"),
  upload.single("scriptFile"),
  submitScriptController
);

router.patch(
  "/:id/script/approve",
  verifyToken,
  authorizeRoles("SUPER_ADMIN", "MANAGER"),
  approveScriptController
);

router.patch(
  "/:id/script/changes",
  verifyToken,
  authorizeRoles("SUPER_ADMIN", "MANAGER"),
  requestScriptChangesController
);

// Asset endpoints
router.post(
  "/:id/assets",
  verifyToken,
  authorizeRoles("SUPER_ADMIN", "MANAGER", "ACCOUNT_MANAGER"),
  upload.single("file"),
  uploadShootAssetController
);

router.get("/:id/assets", verifyToken, getShootAssetsController);

router.delete(
  "/assets/:assetId",
  verifyToken,
  deleteShootAssetController
);

router.post(
  "/:id/generate-tasks",
  verifyToken,
  authorizeRoles("SUPER_ADMIN", "MANAGER"),
  generateEditingTasksController
);

// Employee Shoot Draft submission
router.post(
  "/:id/draft",
  verifyToken,
  authorizeRoles("EMPLOYEE"),
  upload.single("draftFile"),
  submitShootDraftController
);

export default router;
