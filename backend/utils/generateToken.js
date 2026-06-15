import jwt from "jsonwebtoken";

export const generateToken = (user) => {
    // Client model doesn't have a 'role' column — detect via companyName field
    const role = user.role || (user.companyName ? "CLIENT" : undefined);

    return jwt.sign(
        {
            id: user.id,
            role: role,
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