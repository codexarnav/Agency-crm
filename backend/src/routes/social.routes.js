import express from "express";
import {
    getSocialConnections,
    disconnectFacebook,
    disconnectInstagram
} from "../controllers/social.controller.js";
import { verifyToken } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/connections", verifyToken, getSocialConnections);
router.delete("/connections/facebook", verifyToken, disconnectFacebook);
router.delete("/connections/instagram", verifyToken, disconnectInstagram);

export default router;
