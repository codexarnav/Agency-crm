import express from "express";
import {
    createClientController,
    getClientsController,
    updateClientController,
    deleteClientController
} from "../controllers/client.controller.js";
import { verifyToken, authorizeRoles } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get(
    "/",
    verifyToken,
    getClientsController
);

router.post(
    "/create",
    verifyToken,
    authorizeRoles("SUPER_ADMIN", "MANAGER"),
    createClientController
);

router.put(
    "/:id",
    verifyToken,
    authorizeRoles("SUPER_ADMIN", "MANAGER"),
    updateClientController
);

router.delete(
    "/:id",
    verifyToken,
    authorizeRoles("SUPER_ADMIN", "MANAGER"),
    deleteClientController
);

export default router;