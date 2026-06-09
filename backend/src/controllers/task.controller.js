import { createTask, updateTask, deleteTask } from "../services/task.service.js";

export const createTaskManager = async (req, res) => {
    try {
        const task = await createTask(req.body, req.user);
        return res.status(201).json({
            success: true,
            message: "Task Created",
            data: task
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const updateTaskController = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const taskId = req.params.id;
        const task = await updateTask(taskId, companyId, req.body, req.user);
        return res.status(200).json({
            success: true,
            message: "Task updated",
            data: task
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteTaskController = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const taskId = req.params.id;
        await deleteTask(taskId, companyId, req.user);
        return res.status(200).json({
            success: true,
            message: "Task deleted successfully"
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};