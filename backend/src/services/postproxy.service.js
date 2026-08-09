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
    let profiles = [];
    
    // 1. Try with profile_group_id query parameter
    if (groupId) {
        const url = `${getBaseUrl()}/api/profiles?profile_group_id=${groupId}`;
        console.log(`[PostProxy getProfiles] Fetching by profile_group_id: ${url}`);
        try {
            const response = await fetch(url, {
                method: "GET",
                headers: getHeaders()
            });
            const rawText = await response.text();
            console.log(`[PostProxy getProfiles] Status: ${response.status}, Response snippet: ${rawText.substring(0, 500)}`);
            if (response.ok) {
                const data = JSON.parse(rawText);
                let list = Array.isArray(data) ? data : (data.profiles || data.data || []);
                if (Array.isArray(list) && list.length > 0) {
                    profiles = list;
                }
            }
        } catch (err) {
            console.warn(`[PostProxy getProfiles] Warning when fetching by profile_group_id:`, err.message);
        }
    }

    // 2. Fallback: If no profiles found yet, fetch ALL profiles in the PostProxy account
    if (profiles.length === 0) {
        const allUrl = `${getBaseUrl()}/api/profiles`;
        console.log(`[PostProxy getProfiles] Fallback: Fetching ALL profiles: ${allUrl}`);
        try {
            const response = await fetch(allUrl, {
                method: "GET",
                headers: getHeaders()
            });
            const rawText = await response.text();
            console.log(`[PostProxy getProfiles] All profiles status: ${response.status}, Response snippet: ${rawText.substring(0, 500)}`);
            if (response.ok) {
                const data = JSON.parse(rawText);
                let list = Array.isArray(data) ? data : (data.profiles || data.data || []);
                if (Array.isArray(list) && list.length > 0) {
                    if (groupId) {
                        // Filter list for matching group ID (supports profile_group_id, group_id, or nested profile_group.id)
                        const matched = list.filter(p => {
                            const pGroupId = p.profile_group_id || p.group_id || p.profile_group?.id;
                            return !pGroupId || pGroupId === groupId;
                        });
                        profiles = matched.length > 0 ? matched : list;
                    } else {
                        profiles = list;
                    }
                }
            }
        } catch (err) {
            console.error(`[PostProxy getProfiles] Fallback fetch error:`, err.message);
        }
    }

    console.log(`[PostProxy getProfiles] Final parsed profiles count: ${profiles.length} for group ${groupId || 'ALL'}`);

    return profiles.map(p => ({
        id: p.id,
        platform: p.platform,
        username: p.username || p.name || p.page_name || p.title || p.account_name || "",
        name: p.name || p.username || p.page_name || "",
        profileGroupId: p.profile_group_id || p.group_id || p.profile_group?.id || groupId || ""
    }));
};

/**
 * Publish a post to specific profiles via PostProxy
 * @param {string[]} profileIds - Array of PostProxy profile IDs (or platform name identifiers)
 * @param {string} body - The caption/content of the post
 * @param {string[]} mediaUrls - Array of image/video URLs
 * @param {string} [title] - Optional title for platforms that support it (e.g., YouTube)
 * @param {string} [platform] - Optional platform name (e.g., "youtube", "instagram", "facebook")
 * @returns {Promise<{id: string, status: string}>}
 */
export const publishPost = async (profileIds, body, mediaUrls = [], title = null, platform = null) => {
    const url = `${getBaseUrl()}/api/posts`;
    const cleanTitle = title && title.trim() ? title.trim() : null;

    // Post body payload
    const postPayload = {
        body: body || ""
    };
    if (cleanTitle) {
        postPayload.title = cleanTitle;
        postPayload.caption_title = cleanTitle;
        postPayload.headline = cleanTitle;
    }

    // Top-level payload structure for PostProxy
    const requestBody = {
        post: postPayload,
        profiles: profileIds,
        media: mediaUrls || []
    };

    // Include title at top-level and in platform-specific options for maximum compatibility
    if (cleanTitle) {
        requestBody.title = cleanTitle;
        requestBody.post_title = cleanTitle;
        requestBody.video_title = cleanTitle;
        requestBody.options = {
            title: cleanTitle,
            youtube: {
                title: cleanTitle,
                privacyStatus: "public"
            },
            facebook: {
                title: cleanTitle
            },
            instagram: {
                title: cleanTitle
            }
        };
    }

    // Also include top-level body for APIs that require it
    if (body) {
        requestBody.body = body;
    }

    console.log("Posting to PostProxy API:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    if (!response.ok) {
        console.error("PostProxy API returned error:", data);
        throw new Error(data.message || `PostProxy Error: Failed to publish post (${response.status})`);
    }

    return {
        id: data.id || data.post_id || data.data?.id,
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
