import { CreateActivityLog, ListActivityLogs } from "../services/activity-log.service.js";

export const createActivityLogController = async (req, res) => {
    try {
        const userId = req.user.id;
        const log = await CreateActivityLog({ ...req.body, userId });
        return res.status(201).json({
            success: true,
            data: log,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const listActivityLogsController = async (req, res) => {
    try {
        const logs = await ListActivityLogs(req.query);
        return res.status(200).json({
            success: true,
            data: logs,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
