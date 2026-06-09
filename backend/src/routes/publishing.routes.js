import express from 'express';
import {
    schedulePostController,
    getPublishingQueueController,
    getPublishingCalendarController,
    reschedulePostController,
    cancelPostController,
    getPublishingJobByIdController,
} from '../controllers/publishing.controller.js';
import { verifyToken, authorizeRoles } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Apply auth for all routes
router.use(verifyToken);
router.use(authorizeRoles("SUPER_ADMIN", "MANAGER"));

// Schedule a post
router.post('/schedule', schedulePostController);

// Fetch the queue
router.get('/queue', getPublishingQueueController);

// Fetch the calendar items
router.get('/calendar', getPublishingCalendarController);

// Fetch a single publishing job
router.get('/:id', getPublishingJobByIdController);

// Reschedule a post
router.put('/:id/reschedule', reschedulePostController);

// Cancel a scheduled post
router.put('/:id/cancel', cancelPostController);

export default router;
