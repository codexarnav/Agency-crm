import jwt from "jsonwebtoken";

export const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            role: user.role,
            companyId: user.companyId,
            email: user.email,
            mustChangePassword: user.mustChangePassword || false,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d",
        }
    );
};