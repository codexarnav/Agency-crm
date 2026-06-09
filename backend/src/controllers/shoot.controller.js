import * as shootService from "../services/shoot.service.js";

export const createShootBriefController = async (req, res) => {
  try {
    const shoot = await shootService.createShootBrief(req.body, req.user);
    res.status(201).json({ success: true, data: shoot });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllShootsController = async (req, res) => {
  try {
    const shoots = await shootService.getAllShoots(
      req.user.companyId,
      req.user.role,
      req.user.id
    );
    res.status(200).json({ success: true, data: shoots });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getShootByIdController = async (req, res) => {
  try {
    const shoot = await shootService.getShootById(req.params.id, req.user.companyId, req.user);
    res.status(200).json({ success: true, data: shoot });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const scheduleShootController = async (req, res) => {
  try {
    const shoot = await shootService.scheduleShoot(
      req.params.id,
      req.user.companyId,
      req.body,
      req.user
    );
    res.status(200).json({ success: true, data: shoot });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateShootStatusController = async (req, res) => {
  try {
    const shoot = await shootService.updateShootStatus(
      req.params.id,
      req.user.companyId,
      req.body.status,
      req.user
    );
    res.status(200).json({ success: true, data: shoot });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createScriptDraftController = async (req, res) => {
  try {
    const data = req.body.data ? JSON.parse(req.body.data) : req.body;
    const fileBuffer = req.file ? req.file.buffer : null;
    const script = await shootService.createScriptDraft(
      req.params.id,
      req.user.id,
      data,
      fileBuffer
    );
    res.status(200).json({ success: true, data: script });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const submitScriptController = async (req, res) => {
  try {
    const data = req.body.data ? JSON.parse(req.body.data) : req.body;
    const fileBuffer = req.file ? req.file.buffer : null;
    const script = await shootService.submitScript(
      req.params.id,
      req.user.id,
      data,
      req.user,
      fileBuffer
    );
    res.status(200).json({ success: true, data: script });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const approveScriptController = async (req, res) => {
  try {
    const script = await shootService.approveScript(req.params.id, req.user.id);
    res.status(200).json({ success: true, data: script });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const requestScriptChangesController = async (req, res) => {
  try {
    const script = await shootService.requestScriptChanges(
      req.params.id,
      req.user.id,
      req.body.feedback
    );
    res.status(200).json({ success: true, data: script });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const assignCrewMembersController = async (req, res) => {
  try {
    const crew = await shootService.assignCrewMembers(
      req.params.id,
      req.user.companyId,
      req.body.crew,
      req.user
    );
    res.status(200).json({ success: true, data: crew });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getCrewController = async (req, res) => {
  try {
    const crew = await shootService.getCrew(req.params.id, req.user.companyId);
    res.status(200).json({ success: true, data: crew });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const uploadShootAssetController = async (req, res) => {
  try {
    if (!req.file) throw new Error("No file uploaded");

    const asset = await shootService.uploadShootAsset(
      req.params.id,
      req.user.id,
      req.file.buffer,
      req.body.assetType,
      req.body.clientName,
      req.body.shootTitle
    );

    res.status(201).json({ success: true, data: asset });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getShootAssetsController = async (req, res) => {
  try {
    const assets = await shootService.getShootAssets(req.params.id);
    res.status(200).json({ success: true, data: assets });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteShootAssetController = async (req, res) => {
  try {
    await shootService.deleteShootAsset(req.params.assetId, req.user.companyId);
    res.status(200).json({ success: true, message: "Asset deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const generateEditingTasksController = async (req, res) => {
  try {
    const tasks = await shootService.generateEditingTasks(
      req.params.id,
      req.user.id,
      req.body.tasks,
      req.user
    );
    res.status(201).json({ success: true, data: tasks });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const submitShootDraftController = async (req, res) => {
  try {
    if (!req.file) throw new Error("No file uploaded");
    const shoot = await shootService.submitShootDraft(
      req.params.id,
      req.user.id,
      req.file.buffer,
      req.user
    );
    res.status(200).json({ success: true, data: shoot });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
