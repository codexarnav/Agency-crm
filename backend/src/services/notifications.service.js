import prisma from "../config/prisma.js";

export const createNotification = async ({
    senderId,
    receiverId,
    type,
    content,
}) => {

    const notification =
        await prisma.notification.create({
            data: {
                senderId,
                receiverId,
                type,
                content,
            },
        });

    return notification;
};

export const getUserNotifications = async (
    userId
) => {

    const notifications =
        await prisma.notification.findMany({
            where: {
                receiverId: userId,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

    return notifications;
};
export const markNotificationAsRead = async (
    notificationId
) => {

    const notification =
        await prisma.notification.update({
            where: {
                id: notificationId,
            },
            data: {
                isRead: true,
            },
        });

    return notification;
};
export const getUnreadNotificationCount = async (
    userId
) => {

    const count =
        await prisma.notification.count({
            where: {
                receiverId: userId,
                isRead: false,
            },
        });

    return count;
};

export const deleteNotification = async (notificationId) => {
    return await prisma.notification.delete({
        where: { id: notificationId }
    });
};