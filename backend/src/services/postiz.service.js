const getApiKey = () => {
    const apiKey = process.env.POSTIZ_API_KEY;
    if (!apiKey) {
        throw new Error("POSTIZ_API_KEY is not configured");
    }
    return apiKey;
};

const getBaseUrl = () => {
    return (process.env.POSTIZ_API_URL || "http://localhost:4007/api/public/v1").replace(/\/$/, "");
};

const postizRequest = async (path, options = {}) => {
    const response = await fetch(`${getBaseUrl()}${path}`, {
        ...options,
        headers: {
            Authorization: getApiKey(),
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers,
        },
    });

    const rawBody = await response.text();
    let data = {};
    if (rawBody) {
        try {
            data = JSON.parse(rawBody);
        } catch {
            data = { message: rawBody };
        }
    }

    if (!response.ok) {
        const error = new Error(
            data.message || data.msg || data.error || `Postiz request failed (${response.status})`
        );
        error.status = response.status;
        error.details = data;
        throw error;
    }

    return data;
};

export const toPostizPlatform = (platform) => {
    const normalized = String(platform || "").trim().toLowerCase();
    if (normalized === "twitter" || normalized === "x") return "x";
    if (normalized.includes("facebook")) return "facebook";
    if (normalized.includes("instagram")) return "instagram";
    if (normalized.includes("linkedin")) return "linkedin";
    if (normalized.includes("youtube") || normalized.includes("google")) return "youtube";
    if (normalized.includes("tiktok")) return "tiktok";
    return normalized;
};

export const toCrmPlatform = (platform) => {
    const normalized = toPostizPlatform(platform);
    return normalized === "x" ? "twitter" : normalized;
};

export const listIntegrations = async (groupId = null) => {
    const query = groupId ? `?group=${encodeURIComponent(groupId)}` : "";
    const integrations = await postizRequest(`/integrations${query}`);
    return Array.isArray(integrations) ? integrations : [];
};

export const listGroups = async () => {
    const groups = await postizRequest("/groups");
    return Array.isArray(groups) ? groups : [];
};

export const getConnectionUrl = async (platform) => {
    const identifier = toPostizPlatform(platform);
    const data = await postizRequest(`/social/${encodeURIComponent(identifier)}`);
    if (!data.url) {
        throw new Error(`Postiz did not return an authorization URL for ${identifier}`);
    }
    return data.url;
};

export const deleteIntegration = async (integrationId) => {
    try {
        await postizRequest(`/integrations/${encodeURIComponent(integrationId)}`, {
            method: "DELETE",
        });
    } catch (error) {
        if (error.status !== 404) throw error;
    }
    return { success: true };
};

const isVideoUrl = (url) => {
    const value = String(url || "").toLowerCase();
    return /\.(mp4|mov|webm)(\?|$)/.test(value) || value.includes("/video/upload/");
};

const uploadMediaFromUrl = async (url) => {
    const uploaded = await postizRequest("/upload-from-url", {
        method: "POST",
        body: JSON.stringify({ url }),
    });

    const media = uploaded.data || uploaded;
    if (!media.id || !media.path) {
        throw new Error("Postiz returned an invalid media upload response");
    }
    return { id: media.id, path: media.path };
};

const getPlatformSettings = (platform, title, mediaUrls) => {
    const identifier = toPostizPlatform(platform);
    const safeTitle = String(title || "Untitled post").trim();

    if (identifier === "x") {
        return { __type: "x", who_can_reply_post: "everyone" };
    }
    if (identifier === "instagram") {
        return {
            __type: "instagram",
            post_type: mediaUrls.some(isVideoUrl) ? "reel" : "post",
        };
    }
    if (identifier === "youtube") {
        return {
            __type: "youtube",
            title: safeTitle.slice(0, 100),
            type: "public",
            selfDeclaredMadeForKids: "no",
            tags: [],
        };
    }
    if (identifier === "tiktok") {
        return {
            __type: "tiktok",
            title: safeTitle.slice(0, 90),
            privacy_level: "PUBLIC_TO_EVERYONE",
            duet: false,
            stitch: false,
            comment: true,
            autoAddMusic: "no",
            brand_content_toggle: false,
            brand_organic_toggle: false,
            video_made_with_ai: false,
            content_posting_method: "DIRECT_POST",
        };
    }
    return { __type: identifier };
};

const getCreatedPostId = (data) => {
    const candidates = Array.isArray(data)
        ? data
        : Array.isArray(data.posts)
            ? data.posts
            : Array.isArray(data.data)
                ? data.data
                : [data.data || data];
    const first = candidates.find(Boolean) || {};
    return first.id || first.postId || first.group || data.id || data.group || null;
};

export const publishPost = async (
    integrationId,
    body,
    mediaUrls = [],
    title = null,
    platform = null
) => {
    const cleanTitle = String(title || "").trim();
    const cleanBody = String(body || cleanTitle).trim();
    const cleanMediaUrls = (mediaUrls || []).filter(Boolean);
    const uploadedMedia = await Promise.all(cleanMediaUrls.map(uploadMediaFromUrl));

    const payload = {
        type: "now",
        date: new Date().toISOString(),
        shortLink: false,
        tags: [],
        posts: [
            {
                integration: { id: integrationId },
                value: [
                    {
                        content: cleanBody,
                        image: uploadedMedia,
                    },
                ],
                settings: getPlatformSettings(platform, cleanTitle, cleanMediaUrls),
            },
        ],
    };

    const data = await postizRequest("/posts", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    const id = getCreatedPostId(data);
    if (!id) {
        throw new Error("Postiz created the post but did not return a post identifier");
    }
    return { id, status: "PUBLISHED" };
};

export const deletePost = async (postId) => {
    try {
        await postizRequest(`/posts/${encodeURIComponent(postId)}`, {
            method: "DELETE",
        });
    } catch (error) {
        if (error.status !== 404) throw error;
    }
    return { success: true };
};
