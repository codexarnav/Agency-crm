import express from 'express';
import {
    signup,
    login,
    changePassword
} from '../controllers/auth.controller.js';
import { verifyToken } from '../../middleware/auth.middleware.js';
import prisma from '../config/prisma.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get("/me", verifyToken, async (req, res) => {
    try {
        let user;
        if (req.user.role === "CLIENT") {
            user = await prisma.client.findUnique({
                where: { id: req.user.id },
            });
            if (user) {
                user = { ...user, role: "CLIENT" };
            }
        } else {
            user = await prisma.user.findUnique({
                where: { id: req.user.id },
            });
        }

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Strip sensitive fields
        const { passwordHash, ...safeUser } = user;
        return res.json({ user: safeUser });
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch user" });
    }
});
router.post('/change-password', verifyToken, changePassword);
export default router

