import {
    createNotification,
    markNotificationAsRead,
    getUnreadNotificationCount,
    getUserNotifications,
    deleteNotification
} from "../services/notifications.service.js";
export const createNotificationController = async (
    req,
    res
) => {
    try {
        const {
            senderId,
            receiverId,
            type,
            content
        } = req.body;
        const notification =
            await createNotification({
                senderId,
                receiverId,
                type,
                content,
            });
        return res.status(201).json({
            success: true,
            notification,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const getUserNotificationsController = async (
    req,
    res
) => {
    try {
        const { userId } = req.params;
        if (req.user.role === "EMPLOYEE" && req.user.id !== userId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access"
            });
        }
        const notifications =
            await getUserNotifications(userId);
        return res.status(200).json({
            success: true,
            data: notifications,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const markNotificationAsReadController = async (
    req,
    res
) => {
    try {
        const { notificationId } = req.params;
        const notification =
            await markNotificationAsRead(notificationId);
        return res.status(200).json({
            success: true,
            notification,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const getUnreadNotificationCountController = async (
    req,
    res
) => {
    try {
        const { userId } = req.params;
        if (req.user.role === "EMPLOYEE" && req.user.id !== userId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access"
            });
        }
        const count =
            await getUnreadNotificationCount(userId);
        return res.status(200).json({
            success: true,
            count,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const deleteNotificationController = async (req, res) => {
    try {
        const { notificationId } = req.params;
        await deleteNotification(notificationId);
        return res.status(200).json({
            success: true,
            message: "Notification deleted"
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};