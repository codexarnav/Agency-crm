import express from 'express';
import { createActivityLogController, listActivityLogsController } from '../controllers/activity-log.controller.js';
import { verifyToken } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.post("/", verifyToken, createActivityLogController);
router.get("/", verifyToken, listActivityLogsController);

export default router;
