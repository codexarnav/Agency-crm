import express from "express";

import upload from "../../middleware/upload.middleware.js";

import {
    saveAssetController,
    getAssetController,
    getCompanyAssetsController,
    updateAssetController,
    deleteAssetController,
} from "../controllers/assets.controller.js";

import {
    verifyToken,
} from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get(
    "/company",
    verifyToken,
    getCompanyAssetsController
);

router.get(
    "/client/:clientId",
    verifyToken,
    getAssetController
);

router.post(
    "/",
    verifyToken,
    upload.single("clientLogo"),
    saveAssetController
);

router.put(
    "/:clientId",
    verifyToken,
    upload.single("clientLogo"),
    updateAssetController
);

router.delete(
    "/:clientId",
    verifyToken,
    deleteAssetController
);

export default router;