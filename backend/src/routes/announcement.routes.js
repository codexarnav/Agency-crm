import express from 'express';
import {
    createAnnouncementManager,
    getAnnouncementsController,
    updateAnnouncementController,
    deleteAnnouncementController
} from '../controllers/announcement.controller.js';
import { verifyToken, authorizeRoles } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get(
    '/',
    verifyToken,
    getAnnouncementsController
);

router.post(
    '/create-announcement',
    verifyToken,
    authorizeRoles("SUPER_ADMIN", "MANAGER"),
    createAnnouncementManager
);

router.put(
    '/:id',
    verifyToken,
    authorizeRoles("SUPER_ADMIN", "MANAGER"),
    updateAnnouncementController
);

router.delete(
    '/:id',
    verifyToken,
    authorizeRoles("SUPER_ADMIN", "MANAGER"),
    deleteAnnouncementController
);

export default router;