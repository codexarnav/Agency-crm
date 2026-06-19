import express from "express";
import {
    getSocialConnections,
    disconnectFacebook,
    disconnectInstagram,
    disconnectPlatform
} from "../controllers/social.controller.js";
import { verifyToken } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/connections", verifyToken, getSocialConnections);
router.delete("/connections/facebook", verifyToken, disconnectFacebook);
router.delete("/connections/instagram", verifyToken, disconnectInstagram);
router.delete("/connections/:platform", verifyToken, disconnectPlatform);

export default router;
