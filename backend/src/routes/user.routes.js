import express from 'express';
import { createManagerUser, createEmployeeUser, getManagers, getEmployees, updateUserUser, deleteUserUser, getManagersPerformance, changePassword } from '../controllers/user.controller.js';

import { verifyToken, authorizeRoles } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.post("/create-manager", verifyToken, authorizeRoles("SUPER_ADMIN"), createManagerUser);
router.post("/create-employee", verifyToken, authorizeRoles("SUPER_ADMIN", "MANAGER"), createEmployeeUser);

router.get("/managers", verifyToken, authorizeRoles("SUPER_ADMIN", "MANAGER", "EMPLOYEE"), getManagers);
router.get("/employees", verifyToken, authorizeRoles("SUPER_ADMIN", "MANAGER", "EMPLOYEE"), getEmployees);
router.get("/managers/performance", verifyToken, authorizeRoles("SUPER_ADMIN"), getManagersPerformance);

router.post("/change-password", verifyToken, changePassword);

router.put("/:id", verifyToken, updateUserUser);
router.delete("/:id", verifyToken, authorizeRoles("SUPER_ADMIN", "MANAGER"), deleteUserUser);

export default router;