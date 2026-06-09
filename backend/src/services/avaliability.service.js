import prisma from "../config/prisma.js";

export const createAvailabilityRecord = async (
    data,
    loggedInUser
) => {

    const {
        employeeId,
        status,
        date,
        reason,
        notes
    } = data;

    const employee =
        await prisma.user.findFirst({
            where: {
                id: employeeId,
                companyId: loggedInUser.companyId,
                role: "EMPLOYEE"
            }
        });

    if (!employee) {
        throw new Error(
            "Employee not found"
        );
    }

    const STATUS_MAP = {
        "available": "AVAILABLE",
        "on_leave": "ON_LEAVE",
        "half_day": "HALF_DAY",
        "busy": "AVAILABLE",
        "overloaded": "AVAILABLE",
        "not_available": "ON_LEAVE"
    };
    const dbStatus = STATUS_MAP[status] || (status ? status.toUpperCase() : "AVAILABLE");

    const record =
        await prisma.employeeAvailability.create({
            data: {
                companyId:
                    loggedInUser.companyId,

                employeeId,

                status: dbStatus,

                date: new Date(date),

                reason,

                notes,

                createdById:
                    loggedInUser.id
            }
        });

    return record;
};

export const getAvailabilityRecords =
    async (companyId) => {

        return await prisma.employeeAvailability.findMany({
            where: {
                companyId
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                }
            },
            orderBy: {
                date: "desc"
            }
        });
    };

export const getAvailabilityStats =
    async (companyId) => {

        const totalEmployees =
            await prisma.user.count({
                where: {
                    companyId,
                    role: "EMPLOYEE"
                }
            });

        const today =
            new Date();

        const onLeave =
            await prisma.employeeAvailability.count({
                where: {
                    companyId,
                    date: {
                        gte: new Date(
                            today.setHours(0, 0, 0, 0)
                        )
                    },
                    status: {
                        in: [
                            "ON_LEAVE",
                            "SICK_LEAVE"
                        ]
                    }
                }
            });

        return {
            totalEmployees,
            onLeave,
            available:
                totalEmployees - onLeave
        };
    };

export const updateAvailabilityRecord = async (id, companyId, data) => {
    const existing = await prisma.employeeAvailability.findFirst({
        where: { id, companyId }
    });
    if (!existing) {
        throw new Error("Availability record not found");
    }

    const { status, date, reason, notes } = data;
    const updateData = {};
    if (status) {
        const STATUS_MAP = {
            "available": "AVAILABLE",
            "on_leave": "ON_LEAVE",
            "half_day": "HALF_DAY",
            "busy": "AVAILABLE",
            "overloaded": "AVAILABLE",
            "not_available": "ON_LEAVE"
        };
        updateData.status = STATUS_MAP[status] || status.toUpperCase();
    }
    if (date) updateData.date = new Date(date);
    if (reason !== undefined) updateData.reason = reason;
    if (notes !== undefined) updateData.notes = notes;

    return await prisma.employeeAvailability.update({
        where: { id },
        data: updateData
    });
};

export const deleteAvailabilityRecord = async (id, companyId) => {
    const existing = await prisma.employeeAvailability.findFirst({
        where: { id, companyId }
    });
    if (!existing) {
        throw new Error("Availability record not found");
    }
    return await prisma.employeeAvailability.delete({
        where: { id }
    });
};