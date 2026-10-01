import express from "express";
import {
    getSocialConnections,
    beginConnection,
    syncConnection,
    disconnectPlatform
} from "../controllers/social.controller.js";
import { verifyToken } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/connections", verifyToken, getSocialConnections);
router.post("/connections/:platform/connect", verifyToken, beginConnection);
router.post("/connections/:platform/sync", verifyToken, syncConnection);
router.delete("/connections/:platform", verifyToken, disconnectPlatform);

export default router;
