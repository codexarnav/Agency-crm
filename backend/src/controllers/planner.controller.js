import { getPlannerTasks, savePlannerTasks } from "../services/planner.service.js";

export const getPlanner = async (req, res) => {
    try {
        const { clientId, planMonth } = req.query;
        const companyId = req.user.companyId;

        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: "clientId is required"
            });
        }

        if (!planMonth) {
            return res.status(400).json({
                success: false,
                message: "planMonth is required"
            });
        }

        const tasks = await getPlannerTasks(companyId, clientId, planMonth);

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

export const savePlanner = async (req, res) => {
    try {
        const { clientId, planMonth, tasks } = req.body;
        const companyId = req.user.companyId;
        const managerId = req.user.id;

        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: "clientId is required"
            });
        }

        if (!planMonth) {
            return res.status(400).json({
                success: false,
                message: "planMonth is required"
            });
        }

        if (!Array.isArray(tasks)) {
            return res.status(400).json({
                success: false,
                message: "tasks must be an array"
            });
        }

        const savedTasks = await savePlannerTasks(companyId, managerId, clientId, planMonth, tasks);

        return res.status(200).json({
            success: true,
            message: `Plan saved successfully - ${savedTasks.length} tasks synced.`,
            data: savedTasks
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
