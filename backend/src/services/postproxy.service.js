const getHeaders = () => {
    const apiKey = process.env.POSTPROXY_API_KEY;
    if (!apiKey) {
        console.warn("⚠️ POSTPROXY_API_KEY is not defined in environment variables");
    }
    return {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
    };
};

const getBaseUrl = () => {
    return (process.env.POSTPROXY_API_URL || "https://api.postproxy.dev").replace(/\/$/, "");
};

/**
 * Create a new Profile Group in PostProxy for a Client
 * @param {string} name - The name of the client/brand
 * @returns {Promise<{id: string, name: string}>}
 */
export const createProfileGroup = async (name) => {
    const url = `${getBaseUrl()}/api/profile_groups`;
    const response = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            profile_group: { name }
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || `PostProxy Error: Failed to create profile group (${response.status})`);
    }

    // Response structure is typically { id, name, ... } or { profile_group: { id, name } }
    const group = data.profile_group || data;
    return {
        id: group.id,
        name: group.name
    };
};

/**
 * Fetch all Profile Groups in PostProxy
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export const getProfileGroups = async () => {
    const url = `${getBaseUrl()}/api/profile_groups`;
    const response = await fetch(url, {
        method: "GET",
        headers: getHeaders()
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || `PostProxy Error: Failed to fetch profile groups (${response.status})`);
    }

    const groups = data.data || data;
    return Array.isArray(groups) ? groups.map(g => ({ id: g.id, name: g.name })) : [];
};

/**
 * Initialize connection for a specific platform in a Profile Group
 * @param {string} groupId - The PostProxy profile group ID
 * @param {string} platform - The platform to connect (e.g., "instagram", "linkedin")
 * @param {string} redirectUrl - Callback redirect URL
 * @returns {Promise<{url: string}>} - The OAuth redirection URL
 */
export const initializeConnection = async (groupId, platform, redirectUrl) => {
    const url = `${getBaseUrl()}/api/profile_groups/${groupId}/initialize_connection`;
    const response = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            platform: platform.toLowerCase(),
            redirect_url: redirectUrl
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || `PostProxy Error: Failed to initialize connection (${response.status})`);
    }

    return {
        url: data.url
    };
};

/**
 * Fetch all profiles connected to a specific Profile Group
 * @param {string} groupId - PostProxy profile group ID
 * @returns {Promise<Array<{id: string, platform: string, username: string, name: string}>>}
 */
export const getProfiles = async (groupId) => {
    const url = `${getBaseUrl()}/api/profiles?profile_group_id=${groupId}`;
    const response = await fetch(url, {
        method: "GET",
        headers: getHeaders()
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || `PostProxy Error: Failed to fetch profiles (${response.status})`);
    }

    let profiles = [];
    if (Array.isArray(data)) {
        profiles = data;
    } else if (data && Array.isArray(data.profiles)) {
        profiles = data.profiles;
    } else if (data && Array.isArray(data.data)) {
        profiles = data.data;
    }

    return profiles.map(p => ({
        id: p.id,
        platform: p.platform,
        username: p.username || p.name || "",
        name: p.name || ""
    }));
};

/**
 * Publish a post to specific profiles via PostProxy
 * @param {string[]} profileIds - Array of PostProxy profile IDs (or platform name identifiers)
 * @param {string} body - The caption/content of the post
 * @param {string[]} mediaUrls - Array of image/video URLs
 * @param {string} [title] - Optional title for platforms that support it (e.g., YouTube)
 * @returns {Promise<{id: string, status: string}>}
 */
export const publishPost = async (profileIds, body, mediaUrls = [], title = null) => {
    const url = `${getBaseUrl()}/api/posts`;
    const postPayload = { body };
    if (title) {
        postPayload.title = title;
    }
    const response = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            post: postPayload,
            profiles: profileIds,
            media: mediaUrls
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || `PostProxy Error: Failed to publish post (${response.status})`);
    }

    return {
        id: data.id,
        status: data.status || "PUBLISHED"
    };
};

/**
 * Delete a post from PostProxy (and optionally from the social media platform itself)
 * @param {string} postId - The PostProxy post ID
 * @param {boolean} deleteOnPlatform - Whether to remove the post from the platform channel
 */
export const deletePost = async (postId, deleteOnPlatform = true) => {
    const url = `${getBaseUrl()}/api/posts/${postId}${deleteOnPlatform ? "?delete_on_platform=true" : ""}`;
    const response = await fetch(url, {
        method: "DELETE",
        headers: getHeaders()
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        console.error("PostProxy delete failed:", data);
        throw new Error(data.message || `PostProxy Error: Failed to delete post (${response.status})`);
    }
    return { success: true };
};
