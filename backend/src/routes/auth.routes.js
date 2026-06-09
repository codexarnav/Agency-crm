import express from 'express';
import {
    signup,
    login
} from '../controllers/auth.controller.js';
import { verifyToken } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get("/me", verifyToken, (req, res) => {
    return res.json({
        user: req.user,
    });
})
export default router

