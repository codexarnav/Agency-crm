import prisma from "../config/prisma.js";
import { hashPassword } from "../../utils/hashpasswords.js";
import { generateToken } from "../../utils/generateToken.js";
import { comparePassword } from "../../utils/comparepasswords.js";
import { CreateActivityLog } from "./activity-log.service.js";
export const registerCompanyAndSuperAdmin = async (data) => {
    const {
        companyName,
        companyEmail,
        address,
        phoneNumber,
        website,
        industryType,
        employeeCount,
        companyLogo,
        gstId,
        timezone,

        adminName,
        adminEmail,
        adminPhone,
        password,
        profilePicture,
    } = data;

    const result = await prisma.$transaction(async (tx) => {

        const existingCompany = await tx.company.findFirst({
            where: {
                email: companyEmail,
            },
        });

        if (existingCompany) {
            throw new Error("Company already exists");
        }

        const existingAdmin = await tx.user.findFirst({
            where: {
                email: adminEmail,
            },
        });

        if (existingAdmin) {
            throw new Error("Admin already exists");
        }

        const passwordHash = await hashPassword(password);

        const company = await tx.company.create({
            data: {
                name: companyName,
                email: companyEmail,
                address,
                phoneNumber,
                website,
                industryType,
                employeeCount,
                companyLogo,
                gstId,
                timezone,
            },
        });

        const admin = await tx.user.create({
            data: {
                companyId: company.id,

                username: adminName,
                email: adminEmail,
                phoneNumber: adminPhone,

                passwordHash,

                role: "SUPER_ADMIN",

                profilePicture,
                mustChangePassword: false,
            },
        });

        const token = generateToken(admin);

        return {
            success: true,

            token,

            company: {
                id: company.id,
                name: company.name,
                email: company.email,
            },

            user: {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                role: admin.role,
            },
        };
    });

    return result;
};

export const loginUser = async ({
    role,
    identifier,
    password,
}) => {

    let user;

    if (role === "CLIENT") {

        user = await prisma.client.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier },
                ],
            },
        });

        // Attach role for token generation (Client model has no role column)
        if (user) {
            user = { ...user, role: "CLIENT" };
        }

    } else {

        user = await prisma.user.findFirst({
            where: {
                role,

                OR: [
                    { email: identifier },
                    { username: identifier },
                ],
            },
        });

    }

    if (!user) {
        throw new Error("Invalid credentials");
    }

    const isPasswordValid =
        await comparePassword(
            password,
            user.passwordHash
        );

    if (!isPasswordValid) {
        throw new Error("Invalid credentials");
    }

    if (!user.isActive) {
        throw new Error("Account disabled");
    }

    const token = generateToken(user);

    return {
        success: true,
        token,
        user,
    };
};

export const updatePasswordAndClearChangeFlag = async (userId, currentPassword, newPassword, userRole) => {
    // Try User table first, then Client table
    let user = null;
    let isClient = false;

    if (userRole === "CLIENT") {
        user = await prisma.client.findUnique({
            where: { id: userId },
        });
        isClient = true;
    } else {
        user = await prisma.user.findUnique({
            where: { id: userId },
        });
    }

    // Fallback: if not found in expected table, check the other
    if (!user && !isClient) {
        user = await prisma.client.findUnique({
            where: { id: userId },
        });
        if (user) isClient = true;
    }

    if (!user) {
        throw new Error("User not found");
    }

    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
        throw new Error("Invalid current password");
    }

    if (!newPassword || newPassword.length < 6) {
        throw new Error("New password must be at least 6 characters long");
    }

    const newPasswordHash = await hashPassword(newPassword);

    let updatedUser;
    if (isClient) {
        updatedUser = await prisma.client.update({
            where: { id: userId },
            data: {
                passwordHash: newPasswordHash,
                mustChangePassword: false,
            },
        });
    } else {
        updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash: newPasswordHash,
                mustChangePassword: false,
            },
        });
    }

    await CreateActivityLog({
        action: "password_changed",
        entityType: isClient ? "CLIENT" : "USER",
        entityId: userId,
        userId: userId,
        details: {
            message: "Password changed during onboarding",
        },
    }).catch(err => console.error("Error creating activity log for password change:", err));

    const token = generateToken(updatedUser);

    return {
        success: true,
        token,
        user: updatedUser,
    };
};