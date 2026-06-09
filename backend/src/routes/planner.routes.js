import express from "express";
import { getPlanner, savePlanner } from "../controllers/planner.controller.js";
import { verifyToken, authorizeRoles } from "../../middleware/auth.middleware.js";

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

export default router;
