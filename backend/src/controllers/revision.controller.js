import { CreateRevision, ListRevisions } from "../services/revision.service.js";

export const createRevisionController = async (req, res) => {
    try {
        const { taskId } = req.params;
        const revision = await CreateRevision(taskId, req.body);
        return res.status(201).json({
            success: true,
            data: revision,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const listRevisionsController = async (req, res) => {
    try {
        const { taskId } = req.params;
        const revisions = await ListRevisions(taskId);
        return res.status(200).json({
            success: true,
            data: revisions,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
