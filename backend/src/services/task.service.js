import prisma from "../config/prisma.js";

export const createTask = async (rawData, loggedInUser) => {
    const data = { ...rawData };
    if (data.assignedEmployeeId !== undefined) {
        data.employeeId = data.assignedEmployeeId && data.assignedEmployeeId.trim() !== "" ? data.assignedEmployeeId : null;
    }
    if (data.assignedTo !== undefined) {
        data.assignedToName = data.assignedTo;
    }
    if (data.contentDescription !== undefined) {
        data.title = data.contentDescription || "New Content Task";
        data.description = data.contentDescription || "";
    }

    const {
        clientId,
        employeeId,
        title,
        description,
        platform,
        contentType,
        priority,
        productionStatus,
        approvalStatus,
        publishingStatus,
        contentLink,
        dueDate,
        scheduleDateTime,
        // Optional plan fields
        planMonth,
        postingDate,
        day,
        captionCopy,
        managerNotes,
        clientFeedback,
        revisionCount,
        maxRevisions,
        assignmentType,
        clientName,
        assignedToName
    } = data;

    const existingTask = await prisma.task.findFirst({
        where: {
            title,
            companyId: loggedInUser.companyId,
        },
    });

    if (existingTask) {
        throw new Error("Task already exists");
    }

    const employee = employeeId ? await prisma.user.findFirst({
        where: {
            id: employeeId,
            companyId: loggedInUser.companyId,
            role: "EMPLOYEE",
        },
    }) : null;

    if (employeeId && !employee) {
        throw new Error("Employee not found");
    }

    const client = await prisma.client.findFirst({
        where: {
            id: clientId,
            companyId: loggedInUser.companyId,
        },
    });

    if (!client) {
        throw new Error("Client not found");
    }

    if (employeeId && dueDate) {
        const leaveRecord = await prisma.employeeAvailability.findFirst({
            where: {
                employeeId,
                date: new Date(dueDate),
                status: {
                    in: ["ON_LEAVE", "SICK_LEAVE"]
                }
            }
        });

        if (leaveRecord) {
            throw new Error("Employee is unavailable on selected date");
        }
    }

    // Map enums
    const PLATFORM_MAP = {
        "Instagram": "INSTAGRAM", "Facebook": "FACEBOOK", "YouTube": "YOUTUBE", "LinkedIn": "LINKEDIN",
        "Twitter/X": "TWITTER", "Pinterest": "PINTEREST", "Google Ads": "GOOGLE_ADS", "Snapchat": "SNAPCHAT",
        "WhatsApp Business": "WHATSAPP_BUSINESS"
    };
    const CONTENT_TYPE_MAP = {
        "Reel": "REEL", "Short": "SHORT", "Static Post": "STATIC_POST", "Carousel": "CAROUSEL", "Story": "STORY",
        "YouTube Video": "YOUTUBE_VIDEO", "Thumbnail": "THUMBNAIL", "Caption": "CAPTION", "Content Idea": "CONTENT_IDEA",
        "Script": "SCRIPT", "Ad Creative": "AD_CREATIVE", "Blog Post": "BLOG_POST"
    };
    const PRIORITY_MAP = { "low": "LOW", "medium": "MEDIUM", "high": "HIGH", "urgent": "URGENT" };
    const PROD_STATUS_MAP = {
        "todo": "TODO", "in_progress": "IN_PROGRESS", "ready_for_review": "REVIEW",
        "changes_required": "CHANGES_NEEDED", "blocked": "BLOCKED", "completed": "COMPLETED"
    };
    const APPROV_STATUS_MAP = {
        "pending": "PENDING", "manager_approved": "MANAGER_APPROVED", "sent_to_client": "SENT_TO_CLIENT",
        "client_approved": "CLIENT_APPROVED", "client_rejected": "CHANGES_REQUIRED", "final_approved": "FINAL_APPROVED"
    };
    const PUB_STATUS_MAP = {
        "not_scheduled": "NOT_SCHEDULED", "scheduled": "SCHEDULED", "posted": "POSTED",
        "failed": "FAILED_TO_POST", "rescheduled": "RESCHEDULED"
    };

    const task = await prisma.task.create({
        data: {
            companyId: loggedInUser.companyId,
            managerId: loggedInUser.id,
            clientId,
            employeeId: employeeId || null,
            title: title || "New Content Task",
            description: description || "",
            platform: PLATFORM_MAP[platform] || platform || "INSTAGRAM",
            contentType: CONTENT_TYPE_MAP[contentType] || contentType || "REEL",
            productionStatus: PROD_STATUS_MAP[productionStatus] || productionStatus || "TODO",
            approvalStatus: APPROV_STATUS_MAP[approvalStatus] || approvalStatus || "PENDING",
            publishingStatus: PUB_STATUS_MAP[publishingStatus] || publishingStatus || "NOT_SCHEDULED",
            priority: PRIORITY_MAP[priority] || priority || "MEDIUM",
            contentLink: contentLink || null,
            dueDate: dueDate ? new Date(dueDate) : null,
            scheduleDateTime: scheduleDateTime ? new Date(scheduleDateTime) : null,
            planMonth: planMonth || null,
            postingDate: postingDate ? new Date(postingDate) : null,
            day: day || null,
            captionCopy: captionCopy || null,
            managerNotes: managerNotes || null,
            clientFeedback: clientFeedback || null,
            revisionCount: revisionCount ? Number(revisionCount) : 0,
            maxRevisions: maxRevisions ? Number(maxRevisions) : 2,
            assignmentType: assignmentType || "manual",
            clientName: clientName || client.companyName || null,
            assignedToName: assignedToName || (employee ? employee.username : null)
        },
    });

    return task;
};

export const updateTask = async (id, companyId, updates, loggedInUser = null) => {
    const whereClause = { id, companyId };
    if (loggedInUser && loggedInUser.role === "MANAGER") {
        whereClause.managerId = loggedInUser.id;
    }
    const existing = await prisma.task.findFirst({
        where: whereClause
    });

    if (!existing) {
        throw new Error("Task not found or access denied");
    }

    const data = { ...updates };
    if (data.dueDate) data.dueDate = new Date(data.dueDate);
    if (data.postingDate) data.postingDate = new Date(data.postingDate);
    if (data.scheduleDateTime) data.scheduleDateTime = new Date(data.scheduleDateTime);
    if (data.approvalUpdatedAt) data.approvalUpdatedAt = new Date(data.approvalUpdatedAt);

    // Map priority if sent from frontend
    if (data.priority) {
        const priorityEnum = {
            "low": "LOW", "medium": "MEDIUM", "high": "HIGH", "urgent": "URGENT"
        }[data.priority];
        if (priorityEnum) data.priority = priorityEnum;
    }

    // Map platform
    if (data.platform) {
        const platformEnum = {
            "Instagram": "INSTAGRAM", "Facebook": "FACEBOOK", "YouTube": "YOUTUBE", "LinkedIn": "LINKEDIN",
            "Twitter/X": "TWITTER", "Pinterest": "PINTEREST", "Google Ads": "GOOGLE_ADS", "Snapchat": "SNAPCHAT",
            "WhatsApp Business": "WHATSAPP_BUSINESS"
        }[data.platform];
        if (platformEnum) data.platform = platformEnum;
    }

    // Map content type
    if (data.contentType) {
        const contentTypeEnum = {
            "Reel": "REEL", "Short": "SHORT", "Static Post": "STATIC_POST", "Carousel": "CAROUSEL", "Story": "STORY",
            "YouTube Video": "YOUTUBE_VIDEO", "Thumbnail": "THUMBNAIL", "Caption": "CAPTION", "Content Idea": "CONTENT_IDEA",
            "Script": "SCRIPT", "Ad Creative": "AD_CREATIVE", "Blog Post": "BLOG_POST"
        }[data.contentType];
        if (contentTypeEnum) data.contentType = contentTypeEnum;
    }

    // Map production status
    if (data.productionStatus) {
        const prodStatusEnum = {
            "todo": "TODO", "in_progress": "IN_PROGRESS", "ready_for_review": "REVIEW",
            "changes_required": "CHANGES_NEEDED", "blocked": "BLOCKED", "completed": "COMPLETED"
        }[data.productionStatus];
        if (prodStatusEnum) data.productionStatus = prodStatusEnum;
    }

    // Map approval status
    if (data.approvalStatus) {
        const approvStatusEnum = {
            "pending": "PENDING", "manager_approved": "MANAGER_APPROVED", "sent_to_client": "SENT_TO_CLIENT",
            "client_approved": "CLIENT_APPROVED", "client_rejected": "CHANGES_REQUIRED", "final_approved": "FINAL_APPROVED"
        }[data.approvalStatus];
        if (approvStatusEnum) data.approvalStatus = approvStatusEnum;
    }

    // Map publishing status
    if (data.publishingStatus) {
        const pubStatusEnum = {
            "not_scheduled": "NOT_SCHEDULED", "scheduled": "SCHEDULED", "posted": "POSTED",
            "failed": "FAILED_TO_POST", "rescheduled": "RESCHEDULED"
        }[data.publishingStatus];
        if (pubStatusEnum) data.publishingStatus = pubStatusEnum;
    }

    // Map employeeId
    if (data.assignedEmployeeId !== undefined) {
        data.employeeId = data.assignedEmployeeId && data.assignedEmployeeId.trim() !== "" ? data.assignedEmployeeId : null;
        delete data.assignedEmployeeId;
    }

    // Map names
    if (data.assignedTo !== undefined) {
        data.assignedToName = data.assignedTo;
        delete data.assignedTo;
    }

    // Map title/contentDescription
    if (data.contentDescription !== undefined) {
        data.title = data.contentDescription || "Untitled";
        data.description = data.contentDescription || "";
        delete data.contentDescription;
    }

    delete data.id;
    delete data.companyId;

    const task = await prisma.task.update({
        where: { id },
        data
    });

    return task;
};

export const deleteTask = async (id, companyId, loggedInUser = null) => {
    const whereClause = { id, companyId };
    if (loggedInUser && loggedInUser.role === "MANAGER") {
        whereClause.managerId = loggedInUser.id;
    }
    const existing = await prisma.task.findFirst({
        where: whereClause
    });

    if (!existing) {
        throw new Error("Task not found or access denied");
    }

    return await prisma.task.delete({
        where: { id }
    });
};