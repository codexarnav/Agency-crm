import prisma from "../config/prisma.js";
import { hashPassword } from "../../utils/hashpasswords.js";

function generateUsername(name, dob) {
    const cleanName = (name || "").toLowerCase().replace(/\s+/g, "");
    if (!dob) return cleanName;
    const parts = dob.split("-");
    if (parts.length === 3) {
        // HTML date input is YYYY-MM-DD -> convert to DD-MM-YYYY
        const formattedDob = `${parts[2]}-${parts[1]}-${parts[0]}`;
        return `${cleanName}@${formattedDob}`;
    }
    return `${cleanName}@${dob}`;
}

export const CreateManager = async (
    data,
    loggedInUser
) => {

    const {
        username,
        name,
        dob,
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

    const uname = name && dob ? generateUsername(name, dob) : (username || name || email.split("@")[0]);
    const pnum = phoneNumber || phone;

    return await prisma.user.create({
        data: {
            companyId:
                loggedInUser.companyId,

            username: uname,
            name: name || null,
            dob: dob || null,
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
        dob,
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

    const uname = name && dob ? generateUsername(name, dob) : (username || name || email.split("@")[0]);
    const pnum = phoneNumber || phone;

    return await prisma.user.create({
        data: {
            companyId:
                loggedInUser.companyId,

            managerId:
                loggedInUser.role === "MANAGER" ? loggedInUser.id : (assignedManager || null),

            username: uname,
            name: name || null,
            dob: dob || null,
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
    const managers = await prisma.user.findMany({
        where: {
            companyId: loggedInUser.companyId,
            role: "MANAGER",
        },
        select: {
            id: true,
            username: true,
            name: true,
            dob: true,
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
    return managers.map(mgr => ({
        ...mgr,
        name: mgr.name || mgr.username
    }));
};

export const ListEmployees = async (loggedInUser) => {
    const whereClause = {
        companyId: loggedInUser.companyId,
        role: "EMPLOYEE",
    };
    if (loggedInUser.role === "MANAGER") {
        whereClause.managerId = loggedInUser.id;
    }
    const employees = await prisma.user.findMany({
        where: whereClause,
        select: {
            id: true,
            username: true,
            name: true,
            dob: true,
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
    return employees.map(emp => ({
        ...emp,
        name: emp.name || emp.username
    }));
};

export const UpdateUser = async (id, data, loggedInUser) => {
    const {
        username,
        name,
        dob,
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

    if (name !== undefined) updateData.name = name;
    if (dob !== undefined) updateData.dob = dob;

    if (name || dob) {
        const user = await prisma.user.findUnique({ where: { id } });
        if (user) {
            const finalName = name !== undefined ? name : user.name;
            const finalDob = dob !== undefined ? dob : user.dob;
            if (finalName && finalDob) {
                updateData.username = generateUsername(finalName, finalDob);
            }
        }
    } else if (username !== undefined) {
        updateData.username = username;
    }

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