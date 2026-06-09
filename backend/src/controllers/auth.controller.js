import {
    registerCompanyAndSuperAdmin,
    loginUser,
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