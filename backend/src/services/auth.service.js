import prisma from "../config/prisma.js";
import { hashPassword } from "../../utils/hashpasswords.js";
import { generateToken } from "../../utils/generateToken.js";
import { comparePassword } from "../../utils/comparepasswords.js";
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