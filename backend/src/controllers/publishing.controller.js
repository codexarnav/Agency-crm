import {
    schedulePost,
    getPublishingQueue,
    getPublishingCalendar,
    reschedulePost,
    cancelPost,
    getPublishingJobById,
    retryPublishingJob,
    getSocialStatus,
    deletePublishingJob,
} from "../services/publishing.service.js";

/**
 * Schedule a new post
 */
export const schedulePostController = async (req, res) => {
    try {
        const job = await schedulePost(req.body, req.user);
        return res.status(201).json({
            success: true,
            data: job,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Get publishing queue items
 */
export const getPublishingQueueController = async (req, res) => {
    try {
        const filters = { ...req.query };
        if (req.user.role === "MANAGER") {
            filters.managerId = req.user.id;
        }
        const queue = await getPublishingQueue(req.user.companyId, filters);
        return res.status(200).json({
            success: true,
            data: queue,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Get calendar scheduled items
 */
export const getPublishingCalendarController = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const jobs = await getPublishingCalendar(
            req.user.companyId, 
            startDate, 
            endDate,
            req.user.role === "MANAGER" ? req.user.id : null
        );
        return res.status(200).json({
            success: true,
            data: jobs,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Reschedule a post
 */
export const reschedulePostController = async (req, res) => {
    try {
        const { id } = req.params;
        const { scheduledAt } = req.body;
        const job = await reschedulePost(id, req.user.companyId, scheduledAt, req.user);
        return res.status(200).json({
            success: true,
            data: job,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Cancel a post schedule
 */
export const cancelPostController = async (req, res) => {
    try {
        const { id } = req.params;
        const job = await cancelPost(id, req.user.companyId, req.user);
        return res.status(200).json({
            success: true,
            data: job,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Get a single publishing job details
 */
export const getPublishingJobByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const job = await getPublishingJobById(id, req.user.companyId, req.user);
        return res.status(200).json({
            success: true,
            data: job,
        });
    } catch (error) {
        return res.status(404).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Retry a failed publishing job
 */
export const retryPublishingJobController = async (req, res) => {
    try {
        const { id } = req.params;
        const job = await retryPublishingJob(id, req.user.companyId, req.user);
        return res.status(200).json({
            success: true,
            data: job,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Get client's social connection status
 */
export const getSocialStatusController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const status = await getSocialStatus(clientId, req.user.companyId);
        return res.status(200).json({
            success: true,
            data: status,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Delete a publishing job
 */
export const deletePublishingJobController = async (req, res) => {
    try {
        const { id } = req.params;
        const job = await deletePublishingJob(id, req.user.companyId, req.user);
        return res.status(200).json({
            success: true,
            message: "Publishing job deleted successfully",
            data: job,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

