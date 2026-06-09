import express from 'express';
import {
    createTaskManager,
    updateTaskController,
    deleteTaskController
} from '../controllers/task.controller.js';
import { verifyToken, authorizeRoles } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.post(
    '/task-manager',
    verifyToken,
    authorizeRoles("SUPER_ADMIN", "MANAGER"),
    createTaskManager
);

router.put(
    '/:id',
    verifyToken,
    authorizeRoles("SUPER_ADMIN", "MANAGER"),
    updateTaskController
);

router.delete(
    '/:id',
    verifyToken,
    authorizeRoles("SUPER_ADMIN", "MANAGER"),
    deleteTaskController
);

export default router;