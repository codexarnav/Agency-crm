import prisma from "../config/prisma.js";
import { hashPassword } from "../../utils/hashpasswords.js";
import { sendOnboardingEmail } from "./email.service.js";
import crypto from "crypto";

export const createClient = async (data, loggedInUser) => {
    const {
        username,
        companyName,
        email,
        phoneNumber,
        profilePicture,
        brandColor,
        brandName,
        industry,
        contactPerson,
        assignedAM,
        assignedManager,
        monthlyDeliverables,
        deliverableBreakdown,
        startDate,
        renewalDate,
        status,
        platforms,
        notes
    } = data;

    const existingClient = await prisma.client.findFirst({
        where: {
            email,
        },
    });

    if (existingClient) {
        throw new Error("Client already exists");
    }

    // Auto-generate a secure temporary password
    const temporaryPassword = crypto.randomBytes(4).toString("hex"); // e.g. "a3f7c2b1"
    const passwordHash = await hashPassword(temporaryPassword);

    const client = await prisma.client.create({
        data: {
            companyId: loggedInUser.companyId,
            managerId: loggedInUser.role === "MANAGER" ? loggedInUser.id : (assignedManager || null),
            username,
            companyName,
            email,
            phoneNumber,
            passwordHash,
            mustChangePassword: true,
            profilePicture,
            brandColor,
            brandName,
            industry,
            contactPerson,
            assignedAM,
            assignedManager,
            monthlyDeliverables: monthlyDeliverables ? Number(monthlyDeliverables) : 30,
            deliverableBreakdown: deliverableBreakdown || {},
            startDate: startDate ? new Date(startDate) : null,
            renewalDate: renewalDate ? new Date(renewalDate) : null,
            status: status || "active",
            platforms: platforms || [],
            notes: notes || null
        },
    });

    // Send onboarding email with temporary credentials
    console.log(`[VERIFICATION] Generated temporary password for ${email}: ${temporaryPassword}`);
    await sendOnboardingEmail(
        contactPerson || companyName || username,
        email,
        "CLIENT",
        temporaryPassword
    ).catch(err => console.error("Error sending client onboarding email:", err));

    return {
        id: client.id,
        username: client.username,
        companyName: client.companyName,
        email: client.email,
        phoneNumber: client.phoneNumber,
        profilePicture: client.profilePicture,
        brandColor: client.brandColor,
        brandName: client.brandName,
        industry: client.industry,
        contactPerson: client.contactPerson,
        assignedAM: client.assignedAM,
        assignedManager: client.assignedManager,
        monthlyDeliverables: client.monthlyDeliverables,
        deliverableBreakdown: client.deliverableBreakdown,
        startDate: client.startDate,
        renewalDate: client.renewalDate,
        status: client.status,
        platforms: client.platforms,
        notes: client.notes,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt
    };
};

export const getClients = async (companyId, loggedInUser) => {
    // If account manager, filter by AM assignment
    const whereClause = { companyId };
    if (loggedInUser.role === "EMPLOYEE" && loggedInUser.designation === "Account Manager") {
        whereClause.assignedAM = loggedInUser.id;
    } else if (loggedInUser.role === "MANAGER") {
        whereClause.managerId = loggedInUser.id;
    }

    const clients = await prisma.client.findMany({
        where: whereClause,
        orderBy: {
            createdAt: "desc"
        }
    });

    return clients.map(client => ({
        id: client.id,
        username: client.username,
        name: client.companyName, // Frontend maps c.name to client.companyName
        companyName: client.companyName,
        email: client.email,
        phoneNumber: client.phoneNumber,
        profilePicture: client.profilePicture,
        brandColor: client.brandColor,
        brandName: client.brandName,
        industry: client.industry,
        contactPerson: client.contactPerson,
        assignedAM: client.assignedAM,
        assignedManager: client.assignedManager,
        monthlyDeliverables: client.monthlyDeliverables,
        deliverableBreakdown: client.deliverableBreakdown,
        startDate: client.startDate,
        renewalDate: client.renewalDate,
        status: client.status,
        platforms: client.platforms,
        notes: client.notes,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt
    }));
};

export const updateClient = async (id, companyId, data, loggedInUser) => {
    const whereClause = { id, companyId };
    if (loggedInUser.role === "MANAGER") {
        whereClause.managerId = loggedInUser.id;
    }
    const existing = await prisma.client.findFirst({
        where: whereClause
    });

    if (!existing) {
        throw new Error("Client not found or access denied");
    }

    const updateData = { ...data };
    delete updateData.id;
    delete updateData.companyId;
    delete updateData.passwordHash;
    delete updateData.password; // Don't allow password updates via this endpoint

    if (updateData.monthlyDeliverables) {
        updateData.monthlyDeliverables = Number(updateData.monthlyDeliverables);
    }
    if (updateData.startDate) {
        updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.renewalDate) {
        updateData.renewalDate = new Date(updateData.renewalDate);
    }

    const client = await prisma.client.update({
        where: { id },
        data: updateData
    });

    return {
        id: client.id,
        username: client.username,
        name: client.companyName,
        companyName: client.companyName,
        email: client.email,
        phoneNumber: client.phoneNumber,
        profilePicture: client.profilePicture,
        brandColor: client.brandColor,
        brandName: client.brandName,
        industry: client.industry,
        contactPerson: client.contactPerson,
        assignedAM: client.assignedAM,
        assignedManager: client.assignedManager,
        monthlyDeliverables: client.monthlyDeliverables,
        deliverableBreakdown: client.deliverableBreakdown,
        startDate: client.startDate,
        renewalDate: client.renewalDate,
        status: client.status,
        platforms: client.platforms,
        notes: client.notes,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt
    };
};

export const deleteClient = async (id, companyId, loggedInUser) => {
    const whereClause = { id, companyId };
    if (loggedInUser.role === "MANAGER") {
        whereClause.managerId = loggedInUser.id;
    }
    const existing = await prisma.client.findFirst({
        where: whereClause
    });

    if (!existing) {
        throw new Error("Client not found or access denied");
    }

    // Delete related assets first if any
    await prisma.asset.deleteMany({
        where: { clientId: id }
    });

    // Delete tasks associated with the client
    await prisma.task.deleteMany({
        where: { clientId: id }
    });

    return await prisma.client.delete({
        where: { id }
    });
};