import express from "express";

import {
    createAvailabilityController,
    getAvailabilityController,
    getAvailabilityStatsController,
    updateAvailabilityController,
    deleteAvailabilityController
} from "../controllers/avaliability.controller.js";

import {
    verifyToken,
    authorizeRoles
} from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post(
    "/",
    verifyToken,
    authorizeRoles(
        "SUPER_ADMIN",
        "MANAGER"
    ),
    createAvailabilityController
);

router.get(
    "/",
    verifyToken,
    getAvailabilityController
);

router.get(
    "/stats",
    verifyToken,
    getAvailabilityStatsController
);

router.put(
    "/:id",
    verifyToken,
    authorizeRoles(
        "SUPER_ADMIN",
        "MANAGER"
    ),
    updateAvailabilityController
);

router.delete(
    "/:id",
    verifyToken,
    authorizeRoles(
        "SUPER_ADMIN",
        "MANAGER"
    ),
    deleteAvailabilityController
);

export default router;