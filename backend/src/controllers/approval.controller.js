import {
    getApprovalDashboard,
    getApprovalQueue,
    managerApproveTask,
    sendTaskToClient,
    clientApproveTask,
    clientRequestChanges,
} from "../services/approval.service.js";

export const getApprovalDashboardController =
    async (req, res) => {

        try {

            const data =
                await getApprovalDashboard(
                    req.user.companyId
                );

            return res.status(200).json({
                success: true,
                data,
            });

        } catch (error) {

            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    };

export const getApprovalQueueController =
    async (req, res) => {

        try {

            const tasks =
                await getApprovalQueue(
                    req.user.companyId
                );

            return res.status(200).json({
                success: true,
                tasks,
            });

        } catch (error) {

            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    };

export const managerApproveTaskController =
    async (req, res) => {

        try {

            const task =
                await managerApproveTask(
                    req.params.taskId
                );

            return res.status(200).json({
                success: true,
                task,
            });

        } catch (error) {

            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    };

export const sendTaskToClientController =
    async (req, res) => {

        try {

            const task =
                await sendTaskToClient(
                    req.params.taskId
                );

            return res.status(200).json({
                success: true,
                task,
            });

        } catch (error) {

            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    };

export const clientApproveTaskController =
    async (req, res) => {

        try {

            const task =
                await clientApproveTask(
                    req.params.taskId
                );

            return res.status(200).json({
                success: true,
                task,
            });

        } catch (error) {

            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    };

export const clientRequestChangesController =
    async (req, res) => {

        try {

            const task =
                await clientRequestChanges(
                    req.params.taskId,
                    req.body.comment
                );

            return res.status(200).json({
                success: true,
                task,
            });

        } catch (error) {

            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    };