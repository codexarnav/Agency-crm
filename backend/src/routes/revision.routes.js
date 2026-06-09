import express from 'express';
import { createRevisionController, listRevisionsController } from '../controllers/revision.controller.js';
import { verifyToken } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.post("/:taskId", verifyToken, createRevisionController);
router.get("/:taskId", verifyToken, listRevisionsController);

export default router;
