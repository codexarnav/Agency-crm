import {
    uploadToCloudinary
} from "../../utils/uploadtocloudinary.js";

import {
    createOrUpdateAsset,
    getAssetByClientId,
    getCompanyAssets,
    updateAsset,
    deleteAsset,
} from "../services/assets.service.js";


export const saveAssetController =
    async (req, res) => {

        try {

            let logoUrl = req.body.logoUrl || req.body.clientLogo || null;

            if (req.file) {

                const uploaded =
                    await uploadToCloudinary(
                        req.file.buffer
                    );

                logoUrl =
                    uploaded.secure_url;
            }

            const body = req.body || {};

            const asset =
                await createOrUpdateAsset(
                    body.clientId,
                    {
                        clientLogo:
                            logoUrl || body.logoUrl || body.clientLogo || null,

                        brandColor:
                            body.brandColor || body.brandColors || null,

                        fonts:
                            body.fonts || null,

                        tone:
                            body.tone || body.toneOfVoice || null,

                        hashtags:
                            body.hashtags || null,

                        guidelines:
                            body.guidelines || body.contentGuidelines || null,

                        dosAndDonts:
                            body.dosAndDonts || null,

                        driveLink:
                            body.driveLink || body.driveFolderUrl || null,

                        canvaLink:
                            body.canvaLink || body.canvaFolderUrl || null,

                        creativeLink:
                            body.creativeLink || body.previousCreatives || null,

                        competitorReference:
                            body.competitorReference || body.competitorRefs || null,

                        referenceLinks:
                            body.referenceLinks || null,

                        brandNotes:
                            body.brandNotes || null,
                    }
                );

            return res.status(200).json({
                success: true,
                asset,
            });

        } catch (error) {

            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    };


export const getAssetController =
    async (req, res) => {

        try {

            const asset =
                await getAssetByClientId(
                    req.params.clientId
                );

            return res.status(200).json({
                success: true,
                asset,
            });

        } catch (error) {

            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    };

export const getCompanyAssetsController =
    async (req, res) => {

        try {

            const assets =
                await getCompanyAssets(
                    req.user.companyId
                );

            return res.status(200).json({
                success: true,
                assets,
            });

        } catch (error) {

            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    };

export const updateAssetController =
    async (req, res) => {

        try {

            let logoUrl = req.body.logoUrl || req.body.clientLogo || null;

            if (req.file) {

                const uploaded =
                    await uploadToCloudinary(
                        req.file.buffer
                    );

                logoUrl =
                    uploaded.secure_url;
            }

            const body = req.body || {};
            const updateFields = {};
            if (logoUrl || body.logoUrl || body.clientLogo) updateFields.clientLogo = logoUrl || body.logoUrl || body.clientLogo;
            if (body.brandColor || body.brandColors) updateFields.brandColor = body.brandColor || body.brandColors;
            if (body.fonts !== undefined) updateFields.fonts = body.fonts;
            if (body.tone || body.toneOfVoice) updateFields.tone = body.tone || body.toneOfVoice;
            if (body.hashtags !== undefined) updateFields.hashtags = body.hashtags;
            if (body.guidelines || body.contentGuidelines) updateFields.guidelines = body.guidelines || body.contentGuidelines;
            if (body.dosAndDonts !== undefined) updateFields.dosAndDonts = body.dosAndDonts;
            if (body.driveLink || body.driveFolderUrl) updateFields.driveLink = body.driveLink || body.driveFolderUrl;
            if (body.canvaLink || body.canvaFolderUrl) updateFields.canvaLink = body.canvaLink || body.canvaFolderUrl;
            if (body.creativeLink || body.previousCreatives) updateFields.creativeLink = body.creativeLink || body.previousCreatives;
            if (body.competitorReference || body.competitorRefs) updateFields.competitorReference = body.competitorReference || body.competitorRefs;
            if (body.referenceLinks !== undefined) updateFields.referenceLinks = body.referenceLinks;
            if (body.brandNotes !== undefined) updateFields.brandNotes = body.brandNotes;

            const asset =
                await updateAsset(
                    req.params.clientId,
                    updateFields
                );

            return res.status(200).json({
                success: true,
                asset,
            });

        } catch (error) {

            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    };

export const deleteAssetController =
    async (req, res) => {

        try {

            await deleteAsset(
                req.params.clientId
            );

            return res.status(200).json({
                success: true,
                message:
                    "Asset deleted",
            });

        } catch (error) {

            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    };