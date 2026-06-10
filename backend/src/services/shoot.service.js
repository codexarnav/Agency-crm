import prisma from "../config/prisma.js";
import { createNotification } from "./notifications.service.js";
import { createTask } from "./task.service.js";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary.js";

// Helper to validate employee availability on a specific date
const checkEmployeeAvailability = async (employeeId, dateStr, companyId) => {
  if (!dateStr) return;
  const shootDate = new Date(dateStr);
  const startOfDay = new Date(shootDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(shootDate.setHours(23, 59, 59, 999));

  const unavailableRecord = await prisma.employeeAvailability.findFirst({
    where: {
      employeeId,
      companyId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        in: ["ON_LEAVE", "SICK_LEAVE"],
      },
    },
  });

  if (unavailableRecord) {
    const user = await prisma.user.findUnique({ where: { id: employeeId } });
    throw new Error(
      `Employee ${user ? user.username : employeeId} is unavailable on ${new Date(dateStr).toLocaleDateString()} (Leave Reason: ${unavailableRecord.reason || "Not specified"})`
    );
  }
};

// Sync execution tasks for a shoot (Creative Lead + Crew Members)
const syncShootExecutionTasks = async (shootId, companyId, loggedInUser) => {
  const shoot = await prisma.shoot.findUnique({
    where: { id: shootId },
    include: {
      crew: true,
      client: true,
    },
  });
  if (!shoot) return;

  const dueDate = shoot.shootDate || shoot.expectedDeadline;

  // Identify all expected assignees for the shoot execution task:
  // 1. Creative Lead
  // 2. All Crew members
  const expectedAssignees = new Set();
  expectedAssignees.add(shoot.creativeLeadId);
  shoot.crew.forEach((m) => expectedAssignees.add(m.employeeId));

  // Find all existing execution tasks for this shoot
  const existingTasks = await prisma.task.findMany({
    where: {
      description: {
        contains: `[Shoot Execution ID: ${shootId}]`,
      },
      companyId,
    },
  });

  const existingMap = {};
  for (const t of existingTasks) {
    const match = t.description.match(/\[Employee ID: ([a-zA-Z0-9-]+)\]/);
    if (match && match[1]) {
      existingMap[match[1]] = t;
    }
  }

  // Delete tasks for employees no longer assigned
  for (const empId of Object.keys(existingMap)) {
    if (!expectedAssignees.has(empId)) {
      await prisma.task.delete({
        where: { id: existingMap[empId].id },
      });
    }
  }

  // Determine production status based on shoot status
  let productionStatus = "TODO";
  if (shoot.status === "IN_PROGRESS") {
    productionStatus = "IN_PROGRESS";
  } else if ([
    "RAW_UPLOADED", "EDITING", "READY_FOR_REVIEW", "CLIENT_APPROVAL", "PUBLISHED", "COMPLETED"
  ].includes(shoot.status)) {
    productionStatus = "COMPLETED";
  }

  // Create or update tasks for current assignees
  for (const empId of expectedAssignees) {
    const existingTask = existingMap[empId];
    if (existingTask) {
      await prisma.task.update({
        where: { id: existingTask.id },
        data: {
          dueDate: dueDate ? new Date(dueDate) : null,
          priority: { LOW: "LOW", MEDIUM: "MEDIUM", HIGH: "HIGH", URGENT: "URGENT" }[shoot.priority] || "MEDIUM",
          productionStatus: {
            TODO: "TODO",
            IN_PROGRESS: "IN_PROGRESS",
            COMPLETED: "COMPLETED"
          }[productionStatus] || "TODO",
        },
      });
    } else {
      const employee = await prisma.user.findUnique({ where: { id: empId } });

      await prisma.task.create({
        data: {
          companyId,
          clientId: shoot.clientId,
          managerId: shoot.managerId,
          employeeId: empId,
          assignedToName: employee ? employee.username : null,
          clientName: shoot.client ? shoot.client.companyName : null,
          title: `Execute Shoot: ${shoot.title}`,
          description: `Execute shoot objectives and deliverables.\n\n[Shoot Execution ID: ${shootId}] [Employee ID: ${empId}]`,
          platform: "INSTAGRAM",
          contentType: "REEL",
          productionStatus: {
            TODO: "TODO",
            IN_PROGRESS: "IN_PROGRESS",
            COMPLETED: "COMPLETED"
          }[productionStatus] || "TODO",
          approvalStatus: "PENDING",
          publishingStatus: "NOT_SCHEDULED",
          priority: { LOW: "LOW", MEDIUM: "MEDIUM", HIGH: "HIGH", URGENT: "URGENT" }[shoot.priority] || "MEDIUM",
          dueDate: dueDate ? new Date(dueDate) : null,
        },
      });
    }
  }
};

// Helper to sync statuses of existing shoot tasks (both Script task and Execution tasks)
const syncShootTasksStatus = async (shootId, companyId, status) => {
  // Sync execution tasks status
  let executionStatus = null;
  if (status === "IN_PROGRESS") {
    executionStatus = "IN_PROGRESS";
  } else if ([
    "RAW_UPLOADED", "EDITING", "READY_FOR_REVIEW", "CLIENT_APPROVAL", "PUBLISHED", "COMPLETED"
  ].includes(status)) {
    executionStatus = "COMPLETED";
  }

  if (executionStatus) {
    await prisma.task.updateMany({
      where: {
        description: { contains: `[Shoot Execution ID: ${shootId}]` },
        companyId,
      },
      data: {
        productionStatus: executionStatus,
      },
    });
  }
};


// ── SHOOT BRIEF SERVICES ──────────────────────────────────────

export const createShootBrief = async (data, loggedInUser) => {
  const {
    clientId,
    creativeLeadId,
    title,
    objective,
    deliverables,
    targetAudience,
    priority,
    expectedDeadline,
    shootDate,
    shootTime,
    location,
    clientContact,
    notes,
  } = data;

  const companyId = loggedInUser.companyId;

  // Verify client and creative lead exist in the company
  const client = await prisma.client.findFirst({
    where: { id: clientId, companyId },
  });
  if (!client) throw new Error("Client not found in this company");

  const creativeLead = await prisma.user.findFirst({
    where: { id: creativeLeadId, companyId, role: "EMPLOYEE" },
  });
  if (!creativeLead) throw new Error("Creative Lead employee not found");

  // Check creative lead availability if shootDate is set
  if (shootDate) {
    await checkEmployeeAvailability(creativeLeadId, shootDate, companyId);
  }

  const shoot = await prisma.shoot.create({
    data: {
      companyId,
      clientId,
      managerId: loggedInUser.id,
      creativeLeadId,
      title,
      objective,
      deliverables,
      targetAudience,
      priority,
      status: "BRIEF_CREATED",
      expectedDeadline: expectedDeadline ? new Date(expectedDeadline) : null,
      shootDate: shootDate ? new Date(shootDate) : null,
      shootTime,
      location,
      clientContact,
      notes,
    },
  });

  // Create script task for the Creative Lead
  await prisma.task.create({
    data: {
      companyId,
      clientId,
      managerId: loggedInUser.id,
      employeeId: creativeLeadId,
      assignedToName: creativeLead ? creativeLead.username : null,
      clientName: client ? client.companyName : null,
      title: `Write Script: ${title}`,
      description: `Write hook, script body, voiceover, call-to-action, and add references/brief for shoot: "${title}".\n\n[Shoot Script ID: ${shoot.id}]`,
      platform: "INSTAGRAM",
      contentType: "SCRIPT",
      productionStatus: "TODO",
      approvalStatus: "PENDING",
      publishingStatus: "NOT_SCHEDULED",
      priority: { LOW: "LOW", MEDIUM: "MEDIUM", HIGH: "HIGH", URGENT: "URGENT" }[priority] || "MEDIUM",
      dueDate: expectedDeadline ? new Date(expectedDeadline) : (shootDate ? new Date(shootDate) : null),
    },
  });

  // Notify Creative Lead
  await createNotification({
    senderId: loggedInUser.id,
    receiverId: creativeLeadId,
    type: "SHOOT_BRIEF_ASSIGNED",
    content: `You have been assigned as Creative Lead for shoot brief: "${title}"`,
  });

  return shoot;
};

export const getAllShoots = async (companyId, role, userId) => {
  const whereClause = { companyId };

  if (role === "EMPLOYEE") {
    // Show shoots where employee is Creative Lead OR in the crew
    whereClause.OR = [
      { creativeLeadId: userId },
      { crew: { some: { employeeId: userId } } },
    ];
  } else if (role === "CLIENT") {
    whereClause.clientId = userId;
  } else if (role === "MANAGER") {
    whereClause.managerId = userId;
  }

  return await prisma.shoot.findMany({
    where: whereClause,
    include: {
      client: {
        select: {
          id: true,
          companyName: true,
          username: true,
          email: true,
        },
      },
      creativeLead: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      manager: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      crew: {
        include: {
          employee: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      },
      scripts: true,
      assets: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getShootById = async (id, companyId, loggedInUser = null) => {
  const whereClause = { id, companyId };
  if (loggedInUser && loggedInUser.role === "MANAGER") {
    whereClause.managerId = loggedInUser.id;
  }
  const shoot = await prisma.shoot.findFirst({
    where: whereClause,
    include: {
      client: true,
      creativeLead: {
        select: {
          id: true,
          username: true,
          email: true,
          profilePicture: true,
        },
      },
      manager: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      crew: {
        include: {
          employee: {
            select: {
              id: true,
              username: true,
              email: true,
              profilePicture: true,
            },
          },
        },
      },
      scripts: {
        include: {
          employee: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      assets: {
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!shoot) throw new Error("Shoot not found");
  return shoot;
};

export const scheduleShoot = async (id, companyId, data, loggedInUser) => {
  const { shootDate, shootTime, location } = data;

  const shoot = await prisma.shoot.findFirst({
    where: { id, companyId },
    include: {
      crew: true,
    },
  });

  if (!shoot) throw new Error("Shoot not found");
  if (loggedInUser.role === "MANAGER" && shoot.managerId !== loggedInUser.id) {
    throw new Error("Access denied: You do not own this shoot");
  }

  // Validate Creative Lead availability on the new date
  await checkEmployeeAvailability(shoot.creativeLeadId, shootDate, companyId);

  // Validate Crew availability on the new date
  for (const member of shoot.crew) {
    await checkEmployeeAvailability(member.employeeId, shootDate, companyId);
  }

  // Determine next status
  let newStatus = shoot.status;
  if (shoot.status === "BRIEF_CREATED" || shoot.status === "SCRIPT_APPROVED" || shoot.status === "CREW_ASSIGNED") {
    newStatus = "SCHEDULED";
  }

  const updatedShoot = await prisma.shoot.update({
    where: { id },
    data: {
      shootDate: new Date(shootDate),
      shootTime,
      location,
      status: newStatus,
    },
  });

  // Update script task due date if it exists
  const scriptTask = await prisma.task.findFirst({
    where: {
      description: { contains: `[Shoot Script ID: ${id}]` },
      companyId,
    },
  });
  if (scriptTask) {
    await prisma.task.update({
      where: { id: scriptTask.id },
      data: {
        dueDate: new Date(shootDate),
      },
    });
  }

  // Sync execution tasks
  await syncShootExecutionTasks(id, companyId, loggedInUser);

  // Notify Creative Lead
  await createNotification({
    senderId: loggedInUser.id,
    receiverId: shoot.creativeLeadId,
    type: "SHOOT_SCHEDULED",
    content: `Shoot "${shoot.title}" has been scheduled for ${new Date(shootDate).toLocaleDateString()} at ${shootTime}`,
  });

  // Notify Crew members
  for (const member of shoot.crew) {
    await createNotification({
      senderId: loggedInUser.id,
      receiverId: member.employeeId,
      type: "SHOOT_SCHEDULED",
      content: `Shoot "${shoot.title}" has been scheduled for ${new Date(shootDate).toLocaleDateString()} at ${shootTime}`,
    });
  }

  return updatedShoot;
};

export const updateShootStatus = async (id, companyId, status, loggedInUser) => {
  const shoot = await prisma.shoot.findFirst({
    where: { id, companyId },
  });
  if (!shoot) throw new Error("Shoot not found");
  if (loggedInUser && loggedInUser.role === "MANAGER" && shoot.managerId !== loggedInUser.id) {
    throw new Error("Access denied: You do not own this shoot");
  }

  const updated = await prisma.shoot.update({
    where: { id },
    data: { status },
  });

  // Sync tasks statuses
  await syncShootTasksStatus(id, companyId, status);

  if (status === "IN_PROGRESS") {
    // Notify Manager
    await createNotification({
      senderId: loggedInUser.id,
      receiverId: shoot.managerId,
      type: "SHOOT_STARTED",
      content: `Creative Lead ${loggedInUser.username} started shoot: "${shoot.title}"`,
    });
  }

  return updated;
};

export const submitShootDraft = async (shootId, employeeId, fileBuffer, loggedInUser) => {
  const shoot = await prisma.shoot.findUnique({
    where: { id: shootId },
    include: { client: true }
  });
  if (!shoot) throw new Error("Shoot not found");

  const cleanClient = (shoot.client.companyName || "default").replace(/[^a-zA-Z0-9]/g, "_");
  const cleanTitle = (shoot.title || "default").replace(/[^a-zA-Z0-9]/g, "_");
  const folder = `agencyflow/shoots/${cleanClient}/${cleanTitle}/draft`;

  const uploadResult = await uploadToCloudinary(fileBuffer, folder, "auto");
  if (!uploadResult || !uploadResult.secure_url) {
    throw new Error("Shoot draft file upload to Cloudinary failed");
  }

  const updatedShoot = await prisma.shoot.update({
    where: { id: shootId },
    data: {
      shootDraftUrl: uploadResult.secure_url,
      status: "RAW_UPLOADED"
    }
  });

  // Sync tasks statuses
  await syncShootTasksStatus(shootId, shoot.companyId, "RAW_UPLOADED");

  // Notify Manager
  await createNotification({
    senderId: employeeId,
    receiverId: shoot.managerId,
    type: "SHOOT_RAW_UPLOADED",
    content: `Creative Lead ${loggedInUser.username} submitted shoot draft for review: "${shoot.title}"`
  });

  return updatedShoot;
};

// Helper for script files upload
const uploadScriptFile = async (shootId, fileBuffer) => {
  const shoot = await prisma.shoot.findUnique({
    where: { id: shootId },
    include: { client: true }
  });
  if (!shoot) throw new Error("Shoot not found");
  
  const cleanClient = (shoot.client.companyName || "default").replace(/[^a-zA-Z0-9]/g, "_");
  const cleanTitle = (shoot.title || "default").replace(/[^a-zA-Z0-9]/g, "_");
  const folder = `agencyflow/shoots/${cleanClient}/${cleanTitle}/script`;

  const uploadResult = await uploadToCloudinary(fileBuffer, folder, "auto");
  if (!uploadResult || !uploadResult.secure_url) {
    throw new Error("Script file upload to Cloudinary failed");
  }
  return uploadResult.secure_url;
};

// ── SCRIPT SERVICES ──────────────────────────────────────────

export const createScriptDraft = async (shootId, employeeId, data, fileBuffer) => {
  const shoot = await prisma.shoot.findUnique({
    where: { id: shootId },
  });
  if (!shoot) throw new Error("Shoot not found");

  let scriptFileUrl = undefined;
  if (fileBuffer) {
    scriptFileUrl = await uploadScriptFile(shootId, fileBuffer);
  }

  // Create or Update script draft
  const existing = await prisma.shootScript.findFirst({
    where: { shootId, employeeId },
  });

  let script;
  if (existing) {
    const updateData = {
      hook: data.hook,
      script: data.script,
      voiceover: data.voiceover,
      cta: data.cta,
      references: data.references,
      status: "DRAFT",
    };
    if (scriptFileUrl) {
      updateData.scriptFileUrl = scriptFileUrl;
    }
    script = await prisma.shootScript.update({
      where: { id: existing.id },
      data: updateData,
    });
  } else {
    const createData = {
      shootId,
      employeeId,
      hook: data.hook,
      script: data.script,
      voiceover: data.voiceover,
      cta: data.cta,
      references: data.references,
      status: "DRAFT",
    };
    if (scriptFileUrl) {
      createData.scriptFileUrl = scriptFileUrl;
    }
    script = await prisma.shootScript.create({
      data: createData,
    });
  }

  // Update shoot status to SCRIPT_PENDING if it was BRIEF_CREATED
  if (shoot.status === "BRIEF_CREATED") {
    await prisma.shoot.update({
      where: { id: shootId },
      data: { status: "SCRIPT_PENDING" },
    });
  }

  // Update script task status to IN_PROGRESS
  const scriptTask = await prisma.task.findFirst({
    where: {
      description: { contains: `[Shoot Script ID: ${shootId}]` },
      companyId: shoot.companyId,
    },
  });
  if (scriptTask) {
    await prisma.task.update({
      where: { id: scriptTask.id },
      data: {
        productionStatus: "IN_PROGRESS",
        contentLink: scriptFileUrl || undefined
      },
    });
  }

  return script;
};

export const submitScript = async (shootId, employeeId, data, loggedInUser, fileBuffer) => {
  const shoot = await prisma.shoot.findUnique({
    where: { id: shootId },
  });
  if (!shoot) throw new Error("Shoot not found");

  let scriptFileUrl = undefined;
  if (fileBuffer) {
    scriptFileUrl = await uploadScriptFile(shootId, fileBuffer);
  }

  const existing = await prisma.shootScript.findFirst({
    where: { shootId, employeeId },
  });

  let script;
  if (existing) {
    const updateData = {
      hook: data.hook,
      script: data.script,
      voiceover: data.voiceover,
      cta: data.cta,
      references: data.references,
      status: "SUBMITTED",
      submittedAt: new Date(),
    };
    if (scriptFileUrl) {
      updateData.scriptFileUrl = scriptFileUrl;
    }
    script = await prisma.shootScript.update({
      where: { id: existing.id },
      data: updateData,
    });
  } else {
    const createData = {
      shootId,
      employeeId,
      hook: data.hook,
      script: data.script,
      voiceover: data.voiceover,
      cta: data.cta,
      references: data.references,
      status: "SUBMITTED",
      submittedAt: new Date(),
    };
    if (scriptFileUrl) {
      createData.scriptFileUrl = scriptFileUrl;
    }
    script = await prisma.shootScript.create({
      data: createData,
    });
  }

  // Update shoot status to SCRIPT_SUBMITTED
  await prisma.shoot.update({
    where: { id: shootId },
    data: { status: "SCRIPT_SUBMITTED" },
  });

  // Update script task status to REVIEW
  const scriptTask = await prisma.task.findFirst({
    where: {
      description: { contains: `[Shoot Script ID: ${shootId}]` },
      companyId: shoot.companyId,
    },
  });
  if (scriptTask) {
    await prisma.task.update({
      where: { id: scriptTask.id },
      data: {
        productionStatus: "REVIEW",
        contentLink: scriptFileUrl || undefined
      },
    });
  }

  // Notify Manager
  await createNotification({
    senderId: employeeId,
    receiverId: shoot.managerId,
    type: "SHOOT_SCRIPT_SUBMITTED",
    content: `Script submitted for shoot: "${shoot.title}" by ${loggedInUser.username}`,
  });

  return script;
};

export const approveScript = async (shootId, managerId) => {
  const shoot = await prisma.shoot.findUnique({
    where: { id: shootId },
  });
  if (!shoot) throw new Error("Shoot not found");

  const script = await prisma.shootScript.findFirst({
    where: { shootId, status: "SUBMITTED" },
    orderBy: { createdAt: "desc" },
  });

  if (!script) throw new Error("No submitted script found to approve");

  const approvedScript = await prisma.shootScript.update({
    where: { id: script.id },
    data: { status: "APPROVED" },
  });

  // Update shoot status to SCRIPT_APPROVED
  await prisma.shoot.update({
    where: { id: shootId },
    data: { status: "SCRIPT_APPROVED" },
  });

  // Update script task status to COMPLETED / approved
  const scriptTask = await prisma.task.findFirst({
    where: {
      description: { contains: `[Shoot Script ID: ${shootId}]` },
      companyId: shoot.companyId,
    },
  });
  if (scriptTask) {
    await prisma.task.update({
      where: { id: scriptTask.id },
      data: {
        productionStatus: "COMPLETED",
        approvalStatus: "FINAL_APPROVED",
      },
    });
  }

  // Notify Creative Lead
  await createNotification({
    senderId: managerId,
    receiverId: shoot.creativeLeadId,
    type: "SHOOT_SCRIPT_APPROVED",
    content: `Your script for shoot: "${shoot.title}" has been approved!`,
  });

  return approvedScript;
};

export const requestScriptChanges = async (shootId, managerId, feedback) => {
  const shoot = await prisma.shoot.findUnique({
    where: { id: shootId },
  });
  if (!shoot) throw new Error("Shoot not found");

  const script = await prisma.shootScript.findFirst({
    where: { shootId, status: "SUBMITTED" },
    orderBy: { createdAt: "desc" },
  });

  if (!script) throw new Error("No submitted script found to request changes");

  const updatedScript = await prisma.shootScript.update({
    where: { id: script.id },
    data: {
      status: "CHANGES_REQUESTED",
      managerFeedback: feedback,
    },
  });

  // Update shoot status to SCRIPT_CHANGES_REQUESTED
  await prisma.shoot.update({
    where: { id: shootId },
    data: { status: "SCRIPT_CHANGES_REQUESTED" },
  });

  // Update script task status to CHANGES_NEEDED
  const scriptTask = await prisma.task.findFirst({
    where: {
      description: { contains: `[Shoot Script ID: ${shootId}]` },
      companyId: shoot.companyId,
    },
  });
  if (scriptTask) {
    await prisma.task.update({
      where: { id: scriptTask.id },
      data: {
        productionStatus: "CHANGES_NEEDED",
        approvalStatus: "CHANGES_REQUIRED",
      },
    });
  }

  // Notify Creative Lead
  await createNotification({
    senderId: managerId,
    receiverId: shoot.creativeLeadId,
    type: "SHOOT_SCRIPT_CHANGES_REQUESTED",
    content: `Changes requested on your script for shoot: "${shoot.title}". Feedback: "${feedback}"`,
  });

  return updatedScript;
};

// ── CREW SERVICES ───────────────────────────────────────────

export const assignCrewMembers = async (shootId, companyId, crewArray, loggedInUser) => {
  const shoot = await prisma.shoot.findFirst({
    where: { id: shootId, companyId },
  });
  if (!shoot) throw new Error("Shoot not found");
  if (loggedInUser && loggedInUser.role === "MANAGER" && shoot.managerId !== loggedInUser.id) {
    throw new Error("Access denied: You do not own this shoot");
  }

  // Validate employee roles and availability if shoot is scheduled
  for (const member of crewArray) {
    const employee = await prisma.user.findFirst({
      where: { id: member.employeeId, companyId, role: "EMPLOYEE" },
    });
    if (!employee) throw new Error(`Crew employee not found: ${member.employeeId}`);

    if (shoot.shootDate) {
      await checkEmployeeAvailability(member.employeeId, shoot.shootDate, companyId);
    }
  }

  // Delete existing crew members
  await prisma.shootCrew.deleteMany({
    where: { shootId },
  });

  // Create new crew members
  const crewData = crewArray.map((m) => ({
    shootId,
    employeeId: m.employeeId,
    role: m.role,
  }));

  const createdCrew = await prisma.shootCrew.createMany({
    data: crewData,
  });

  // Determine next status
  let newStatus = shoot.status;
  if (shoot.status === "BRIEF_CREATED" || shoot.status === "SCRIPT_APPROVED") {
    newStatus = "CREW_ASSIGNED";
  }

  await prisma.shoot.update({
    where: { id: shootId },
    data: { status: newStatus },
  });

  // Sync execution tasks
  await syncShootExecutionTasks(shootId, companyId, loggedInUser);

  // Notify newly assigned crew members
  for (const member of crewArray) {
    await createNotification({
      senderId: loggedInUser.id,
      receiverId: member.employeeId,
      type: "SHOOT_CREW_ASSIGNED",
      content: `You have been assigned as ${member.role} for shoot: "${shoot.title}"`,
    });
  }

  return createdCrew;
};

export const getCrew = async (shootId, companyId) => {
  const shoot = await prisma.shoot.findFirst({
    where: { id: shootId, companyId },
  });
  if (!shoot) throw new Error("Shoot not found");

  return await prisma.shootCrew.findMany({
    where: { shootId },
    include: {
      employee: {
        select: {
          id: true,
          username: true,
          email: true,
          profilePicture: true,
        },
      },
    },
  });
};

// ── ASSET SERVICES ──────────────────────────────────────────

export const uploadShootAsset = async (shootId, uploadedBy, fileBuffer, assetType, clientName, shootTitle) => {
  const shoot = await prisma.shoot.findUnique({
    where: { id: shootId },
    include: {
      client: true,
    },
  });
  if (!shoot) throw new Error("Shoot not found");

  // Clean strings for Cloudinary directory paths
  const cleanClient = (clientName || shoot.client.companyName || "default").replace(/[^a-zA-Z0-9]/g, "_");
  const cleanTitle = (shootTitle || shoot.title || "default").replace(/[^a-zA-Z0-9]/g, "_");
  const folder = `agencyflow/shoots/${cleanClient}/${cleanTitle}/${assetType.toLowerCase()}`;

  // Upload asset buffer to Cloudinary
  const uploadResult = await uploadToCloudinary(fileBuffer, folder, "auto");
  if (!uploadResult || !uploadResult.secure_url) {
    throw new Error("Asset upload to Cloudinary failed");
  }

  const asset = await prisma.shootAsset.create({
    data: {
      shootId,
      assetUrl: uploadResult.secure_url,
      assetType,
      uploadedBy,
    },
  });

  // Automatically progress shoot status based on uploaded asset type
  let nextStatus = shoot.status;
  if (assetType === "RAW" && shoot.status !== "COMPLETED") {
    nextStatus = "RAW_UPLOADED";
  } else if (assetType === "EDITED" && shoot.status !== "COMPLETED") {
    nextStatus = "READY_FOR_REVIEW";
  }

  await prisma.shoot.update({
    where: { id: shootId },
    data: { status: nextStatus },
  });

  // Sync tasks statuses
  await syncShootTasksStatus(shootId, shoot.companyId, nextStatus);

  // Notify Manager
  await createNotification({
    senderId: uploadedBy,
    receiverId: shoot.managerId,
    type: "SHOOT_RAW_UPLOADED",
    content: `New ${assetType} asset uploaded for shoot: "${shoot.title}"`,
  });

  return asset;
};

export const getShootAssets = async (shootId) => {
  return await prisma.shootAsset.findMany({
    where: { shootId },
    include: {
      uploader: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });
};

export const deleteShootAsset = async (assetId, companyId) => {
  const asset = await prisma.shootAsset.findUnique({
    where: { id: assetId },
    include: {
      shoot: true,
    },
  });

  if (!asset || asset.shoot.companyId !== companyId) {
    throw new Error("Asset not found or access denied");
  }

  return await prisma.shootAsset.delete({
    where: { id: assetId },
  });
};

// ── TASK INTEGRATION SERVICES ───────────────────────────────

export const generateEditingTasks = async (shootId, managerId, tasksList, loggedInUser) => {
  const shoot = await prisma.shoot.findUnique({
    where: { id: shootId },
    include: {
      crew: {
        where: { role: "EDITOR" },
        include: {
          employee: {
            select: { id: true, username: true },
          },
        },
      },
    },
  });

  if (!shoot) throw new Error("Shoot not found");

  const editors = shoot.crew;
  const createdTasks = [];

  // Generate editing tasks using existing Task Service
  for (let i = 0; i < tasksList.length; i++) {
    const taskTitle = tasksList[i];
    
    // Assign editors round-robin if editors are present
    const editor = editors.length > 0 ? editors[i % editors.length] : null;

    const taskData = {
      clientId: shoot.clientId,
      assignedEmployeeId: editor ? editor.employeeId : null,
      assignedTo: editor ? editor.employee.username : null,
      contentDescription: taskTitle,
      platform: "Instagram", // Default platform
      contentType: "Reel", // Default content type
      priority: "medium",
      productionStatus: "todo",
      approvalStatus: "pending",
      publishingStatus: "not_scheduled",
      dueDate: shoot.expectedDeadline || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Expected deadline or 3 days
    };

    const task = await createTask(taskData, loggedInUser);
    createdTasks.push(task);

    // Notify Editor
    if (editor) {
      await createNotification({
        senderId: managerId,
        receiverId: editor.employeeId,
        type: "SHOOT_EDITING_TASKS_GENERATED",
        content: `New editing task: "${taskTitle}" assigned to you for shoot: "${shoot.title}"`,
      });
    }
  }

  // Update shoot status to EDITING
  await prisma.shoot.update({
    where: { id: shootId },
    data: { status: "EDITING" },
  });

  // Sync tasks statuses
  await syncShootTasksStatus(shootId, shoot.companyId, "EDITING");

  return createdTasks;
};
