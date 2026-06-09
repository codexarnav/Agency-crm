import prisma from "../config/prisma.js";
import { hashPassword } from "../../utils/hashpasswords.js";

export const CreateManager = async (
    data,
    loggedInUser
) => {

    const {
        username,
        name,
        email,
        phoneNumber,
        phone,
        password,
        profilePicture,
        designation,
        department,
        skills,
        availability,
        notes,
    } = data;

    const existingUser =
        await prisma.user.findFirst({
            where: {
                email,
                companyId:
                    loggedInUser.companyId,
            },
        });

    if (existingUser) {
        throw new Error(
            "Manager already exists"
        );
    }

    const passwordHash =
        await hashPassword(password);

    const uname = username || name || email.split("@")[0];
    const pnum = phoneNumber || phone;

    return await prisma.user.create({
        data: {
            companyId:
                loggedInUser.companyId,

            username: uname,
            email,
            phoneNumber: pnum,

            passwordHash,

            profilePicture,
            designation,
            department,
            skills: skills || [],
            availability: availability || "available",
            notes,

            role: "MANAGER",
        },
    });
};

export const CreateEmployee = async (
    data,
    loggedInUser
) => {

    const {
        username,
        name,
        email,
        phoneNumber,
        phone,
        password,
        profilePicture,
        designation,
        department,
        skills,
        availability,
        notes,
        assignedManager,
    } = data;

    const existingUser =
        await prisma.user.findFirst({
            where: {
                email,
                companyId:
                    loggedInUser.companyId,
            },
        });

    if (existingUser) {
        throw new Error(
            "Employee already exists"
        );
    }

    const passwordHash =
        await hashPassword(password);

    const uname = username || name || email.split("@")[0];
    const pnum = phoneNumber || phone;

    return await prisma.user.create({
        data: {
            companyId:
                loggedInUser.companyId,

            managerId:
                loggedInUser.role === "MANAGER" ? loggedInUser.id : (assignedManager || null),

            username: uname,
            email,
            phoneNumber: pnum,

            passwordHash,

            profilePicture,
            designation,
            department,
            skills: skills || [],
            availability: availability || "available",
            notes,

            role: "EMPLOYEE",
        },
    });
};

export const ListManagers = async (loggedInUser) => {
    return await prisma.user.findMany({
        where: {
            companyId: loggedInUser.companyId,
            role: "MANAGER",
        },
        select: {
            id: true,
            username: true,
            email: true,
            phoneNumber: true,
            profilePicture: true,
            isActive: true,
            createdAt: true,
            designation: true,
            department: true,
            skills: true,
            availability: true,
            notes: true,
        },
        orderBy: { createdAt: "desc" },
    });
};

export const ListEmployees = async (loggedInUser) => {
    const whereClause = {
        companyId: loggedInUser.companyId,
        role: "EMPLOYEE",
    };
    if (loggedInUser.role === "MANAGER") {
        whereClause.managerId = loggedInUser.id;
    }
    return await prisma.user.findMany({
        where: whereClause,
        select: {
            id: true,
            username: true,
            email: true,
            phoneNumber: true,
            profilePicture: true,
            isActive: true,
            createdAt: true,
            managerId: true,
            designation: true,
            department: true,
            skills: true,
            availability: true,
            notes: true,
        },
        orderBy: { createdAt: "desc" },
    });
};

export const UpdateUser = async (id, data, loggedInUser) => {
    const {
        username,
        name,
        email,
        phoneNumber,
        phone,
        password,
        profilePicture,
        role,
        isActive,
        designation,
        department,
        skills,
        availability,
        notes,
        assignedManager,
    } = data;

    const updateData = {};
    const uname = username || name;
    const pnum = phoneNumber || phone;

    if (uname !== undefined) updateData.username = uname;
    if (email !== undefined) updateData.email = email;
    if (pnum !== undefined) updateData.phoneNumber = pnum;
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture;
    if (role !== undefined) {
        const uppercaseRole = role.toUpperCase().replace("ACCOUNTMANAGER", "EMPLOYEE");
        if (["SUPER_ADMIN", "MANAGER", "EMPLOYEE"].includes(uppercaseRole)) {
            updateData.role = uppercaseRole;
        }
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    if (designation !== undefined) updateData.designation = designation;
    if (department !== undefined) updateData.department = department;
    if (skills !== undefined) updateData.skills = skills;
    if (availability !== undefined) updateData.availability = availability;
    if (notes !== undefined) updateData.notes = notes;
    if (assignedManager !== undefined) updateData.managerId = assignedManager || null;

    if (password) {
        updateData.passwordHash = await hashPassword(password);
    }

    return await prisma.user.update({
        where: { id },
        data: updateData,
    });
};

export const DeleteUser = async (id, loggedInUser) => {
    return await prisma.user.delete({
        where: { id },
    });
};

export const ListManagersPerformance = async (loggedInUser) => {
    const companyId = loggedInUser.companyId;

    const managers = await prisma.user.findMany({
        where: {
            companyId,
            role: "MANAGER"
        },
        select: {
            id: true,
            username: true,
            designation: true
        }
    });

    const performanceData = [];

    for (const manager of managers) {
        const clientsCount = await prisma.client.count({
            where: { companyId, managerId: manager.id }
        });

        const employeesCount = await prisma.user.count({
            where: { companyId, managerId: manager.id, role: "EMPLOYEE" }
        });

        const totalTasks = await prisma.task.count({
            where: { companyId, managerId: manager.id }
        });

        const completedTasks = await prisma.task.count({
            where: { companyId, managerId: manager.id, productionStatus: "COMPLETED" }
        });

        const shootsCount = await prisma.shoot.count({
            where: { companyId, managerId: manager.id }
        });

        const totalPubJobs = await prisma.publishingJob.count({
            where: { companyId, managerId: manager.id }
        });

        const postedPubJobs = await prisma.publishingJob.count({
            where: { companyId, managerId: manager.id, status: "POSTED" }
        });

        const failedPubJobs = await prisma.publishingJob.count({
            where: { companyId, managerId: manager.id, status: "FAILED" }
        });

        const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const timelinessDenom = postedPubJobs + failedPubJobs;
        const timelinessPct = timelinessDenom > 0 ? Math.round((postedPubJobs / timelinessDenom) * 100) : 100;

        performanceData.push({
            id: manager.id,
            name: manager.username,
            designation: manager.designation || "Manager",
            clients: clientsCount,
            employees: employeesCount,
            tasks: totalTasks,
            shoots: shootsCount,
            publishingJobs: totalPubJobs,
            completion: completionPct,
            timeliness: timelinessPct
        });
    }

    return performanceData;
};