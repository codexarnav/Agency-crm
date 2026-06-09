import {
    getOverviewAnalytics,
    getMostOverloadedEmployee,
    getHighestRevisionClient,
} from "../services/report.service.js";

export const getReportDashboard =
    async (req, res) => {

        try {

            const companyId =
                req.user.companyId;

            const [
                overview,
                overloadedEmployee,
                revisionClient,
            ] = await Promise.all([
                getOverviewAnalytics(companyId),
                getMostOverloadedEmployee(companyId),
                getHighestRevisionClient(companyId),
            ]);

            return res.status(200).json({
                success: true,

                data: {
                    overview,
                    overloadedEmployee,
                    revisionClient,
                },
            });

        } catch (error) {

            return res.status(500).json({
                success: false,
                message: error.message,
            });

        }
    };