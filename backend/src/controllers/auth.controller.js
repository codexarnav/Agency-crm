import {
    registerCompanyAndSuperAdmin,
    loginUser,
    updatePasswordAndClearChangeFlag,
} from "../services/auth.service.js";

export const signup = async (req, res) => {
    try {
        const result =
            await registerCompanyAndSuperAdmin(
                req.body
            );

        return res.status(201).json(result);

    } catch (error) {

        return res.status(400).json({
            success: false,
            message: error.message,
        });

    }
};


export const login = async (
    req,
    res
) => {
    try {

        const result =
            await loginUser(req.body);

        return res.status(200).json(result);

    } catch (error) {

        return res.status(400).json({
            success: false,
            message: error.message,
        });

    }
};

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        const result = await updatePasswordAndClearChangeFlag(userId, currentPassword, newPassword, userRole);

        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};