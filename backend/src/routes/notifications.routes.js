import express from 'express';

import {
    createNotificationController,
    getUserNotificationsController,
    markNotificationAsReadController,
    getUnreadNotificationCountController,
    deleteNotificationController
} from '../controllers/notifications.controller.js';

import { verifyToken } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.post(
    '/',
    verifyToken,
    createNotificationController
);

router.get(
    '/:userId/unread-count',
    verifyToken,
    getUnreadNotificationCountController
);

router.get(
    '/:userId',
    verifyToken,
    getUserNotificationsController
);

router.put(
    '/:notificationId/read',
    verifyToken,
    markNotificationAsReadController
);

router.delete(
    '/:notificationId',
    verifyToken,
    deleteNotificationController
);

export default router;