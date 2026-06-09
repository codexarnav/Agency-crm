import {
    getTaskDashboardStats,
    getTasks,
    updateTaskStatus
} from "../services/task-dashboard.service.js";


export const getTaskDashboardStatsController =
    async (req, res) => {

        try {

            const companyId = req.user.companyId;
            const managerId = req.user.role === "MANAGER" ? req.user.id : null;

            const stats =
                await getTaskDashboardStats(companyId, managerId);

            return res.status(200).json({
                success: true,
                data: stats
            });

        } catch (error) {

            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    };


export const getTasksController =
    async (req, res) => {

        try {

            const companyId = req.user.companyId;
            const role = req.user.role;
            const userId = req.user.id;

            const tasks =
                await getTasks(
                    companyId, 
                    role === "EMPLOYEE" ? userId : null,
                    role === "CLIENT" ? userId : null,
                    role === "MANAGER" ? userId : null
                );

            return res.status(200).json({
                success: true,
                data: tasks
            });

        } catch (error) {

            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    };

export const updateTaskStatusController =
    async (req, res) => {

        try {

            const taskId = req.params.taskId;
            const updates = req.body;

            const updatedTask = await updateTaskStatus(
                taskId,
                updates
            );

            return res.status(200).json({
                success: true,
                data: updatedTask
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    };

