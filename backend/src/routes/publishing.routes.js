import express from 'express';
import {
    schedulePostController,
    getPublishingQueueController,
    getPublishingCalendarController,
    reschedulePostController,
    cancelPostController,
    getPublishingJobByIdController,
    retryPublishingJobController,
    getSocialStatusController,
    deletePublishingJobController,
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

// Get social connection status for scheduling validation
router.get('/social-status/:clientId', getSocialStatusController);

// Fetch a single publishing job
router.get('/:id', getPublishingJobByIdController);

// Reschedule a post
router.put('/:id/reschedule', reschedulePostController);

// Cancel a scheduled post
router.put('/:id/cancel', cancelPostController);

// Retry a failed publishing job
router.post('/:id/retry', retryPublishingJobController);

// Delete a publishing job
router.delete('/:id', deletePublishingJobController);

export default router;
