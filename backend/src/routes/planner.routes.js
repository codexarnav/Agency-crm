import express from "express";
import { getPlanner, savePlanner } from "../controllers/planner.controller.js";
import { importPlannerExcel } from "../modules/planner/planner-import.controller.js";
import { verifyToken, authorizeRoles } from "../../middleware/auth.middleware.js";
import upload from "../../middleware/upload.middleware.js";

const router = express.Router();

router.get(
    "/",
    verifyToken,
    authorizeRoles("SUPER_ADMIN", "MANAGER"),
    getPlanner
);

router.post(
    "/save",
    verifyToken,
    authorizeRoles("SUPER_ADMIN", "MANAGER"),
    savePlanner
);

router.post(
    "/import-excel",
    verifyToken,
    authorizeRoles("SUPER_ADMIN", "MANAGER"),
    upload.single("file"),
    importPlannerExcel
);

export default router;

