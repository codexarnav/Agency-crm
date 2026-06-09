import { createAvailabilityRecord, getAvailabilityRecords, getAvailabilityStats, updateAvailabilityRecord, deleteAvailabilityRecord } from "../services/avaliability.service.js";

export const createAvailabilityController =
    async (req, res) => {

        try {

            const record =
                await createAvailabilityRecord(
                    req.body,
                    req.user
                );

            res.status(201).json({
                success: true,
                data: record
            });

        } catch (error) {

            res.status(400).json({
                success: false,
                message: error.message
            });

        }
    };

export const getAvailabilityController =
    async (req, res) => {

        try {

            const records =
                await getAvailabilityRecords(
                    req.user.companyId
                );

            res.json({
                success: true,
                data: records
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                message: error.message
            });

        }
    };

export const getAvailabilityStatsController =
    async (req, res) => {

        try {

            const stats =
                await getAvailabilityStats(
                    req.user.companyId
                );

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                message: error.message
            });

        }
    };

export const updateAvailabilityController = async (req, res) => {
    try {
        const record = await updateAvailabilityRecord(req.params.id, req.user.companyId, req.body);
        res.status(200).json({
            success: true,
            data: record
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteAvailabilityController = async (req, res) => {
    try {
        await deleteAvailabilityRecord(req.params.id, req.user.companyId);
        res.status(200).json({
            success: true,
            message: "Record deleted successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

