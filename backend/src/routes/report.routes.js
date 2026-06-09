import express from "express";

import {
    getReportDashboard,
} from "../controllers/report.controller.js";

import {
    verifyToken,
} from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get(
    "/dashboard",
    verifyToken,
    getReportDashboard
);

export default router;