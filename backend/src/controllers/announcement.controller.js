import {
    createAnnouncement,
    getAnnouncements,
    updateAnnouncement,
    deleteAnnouncement
} from "../services/announcement.service.js";

export const createAnnouncementManager = async (req, res) => {
    try {
        const announcement = await createAnnouncement(req.body, req.user);
        return res.status(201).json({
            success: true,
            message: "Announcement Created",
            data: announcement
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const getAnnouncementsController = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const announcements = await getAnnouncements(companyId, req.user.id, req.user.role);
        return res.status(200).json({
            success: true,
            data: announcements
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const updateAnnouncementController = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const announcementId = req.params.id;
        const announcement = await updateAnnouncement(announcementId, companyId, req.body);
        return res.status(200).json({
            success: true,
            message: "Announcement updated",
            data: announcement
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteAnnouncementController = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const announcementId = req.params.id;
        await deleteAnnouncement(announcementId, companyId);
        return res.status(200).json({
            success: true,
            message: "Announcement deleted successfully"
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};