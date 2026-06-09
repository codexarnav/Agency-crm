import express from 'express';
import { createManagerUser, createEmployeeUser, getManagers, getEmployees, updateUserUser, deleteUserUser, getManagersPerformance } from '../controllers/user.controller.js';

import { verifyToken, authorizeRoles } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.post("/create-manager", verifyToken, authorizeRoles("SUPER_ADMIN"), createManagerUser);
router.post("/create-employee", verifyToken, authorizeRoles("SUPER_ADMIN", "MANAGER"), createEmployeeUser);

router.get("/managers", verifyToken, authorizeRoles("SUPER_ADMIN"), getManagers);
router.get("/employees", verifyToken, authorizeRoles("SUPER_ADMIN", "MANAGER"), getEmployees);
router.get("/managers/performance", verifyToken, authorizeRoles("SUPER_ADMIN"), getManagersPerformance);

router.put("/:id", verifyToken, authorizeRoles("SUPER_ADMIN", "MANAGER"), updateUserUser);
router.delete("/:id", verifyToken, authorizeRoles("SUPER_ADMIN", "MANAGER"), deleteUserUser);

export default router;