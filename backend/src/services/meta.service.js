import dotenv from "dotenv";

dotenv.config();

const DRY_RUN = process.env.PUBLISHING_DRY_RUN === "true";

/**
 * Helper to check if a connection is mock
 */
const isMockConnection = (connection) => {
  return (
    DRY_RUN ||
    connection.facebookPageId?.startsWith("mock_") ||
    connection.instagramBusinessId?.startsWith("mock_")
  );
};

/**
 * Publish a post to Facebook Page
 */
export const publishToFacebook = async (connection, caption, imageUrl) => {
  if (isMockConnection(connection)) {
    console.log(`[DRY RUN/MOCK] Publishing to Facebook Page: ${connection.facebookPageName}`);
    return `mock_fb_post_${Math.random().toString(36).substring(2, 11)}`;
  }

  const { facebookPageId, facebookPageAccessToken } = connection;

  console.log("Publishing Facebook Post");
  console.log("Token Source: facebookPageAccessToken");
  console.log("Token Type: PAGE");
  console.log(`Page ID: ${facebookPageId}`);

  if (!facebookPageId || !facebookPageAccessToken) {
    throw new Error("Facebook Page ID or Access Token is missing");
  }

  let url, body;
  if (imageUrl) {
    url = `https://graph.facebook.com/v19.0/${facebookPageId}/photos`;
    body = {
      url: imageUrl,
      message: caption || "",
      access_token: facebookPageAccessToken,
    };
  } else {
    url = `https://graph.facebook.com/v19.0/${facebookPageId}/feed`;
    body = {
      message: caption || "",
      access_token: facebookPageAccessToken,
    };
  }

  console.log(`Publishing to Facebook Page: ${facebookPageId}`);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Facebook Publishing Error Response:", data);
    throw new Error(data.error?.message || "Failed to publish to Facebook");
  }

  return data.post_id || data.id;
};

/**
 * Publish a post to Instagram Business Account via Container API
 */
export const publishToInstagram = async (connection, caption, imageUrl) => {
  if (isMockConnection(connection)) {
    console.log(`[DRY RUN/MOCK] Publishing to Instagram Business: ${connection.instagramUsername}`);
    return `mock_ig_post_${Math.random().toString(36).substring(2, 11)}`;
  }

  const { instagramBusinessId, facebookPageAccessToken } = connection;

  console.log("Publishing Instagram Post");
  console.log("Token Source: facebookPageAccessToken");
  console.log("Token Type: PAGE");
  console.log(`Instagram ID: ${instagramBusinessId}`);

  if (!instagramBusinessId) {
    throw new Error("Instagram Business Account is not linked to this client");
  }

  if (!imageUrl) {
    throw new Error("Instagram requires an image URL to publish a post");
  }

  // Step 1: Create Container
  const containerUrl = `https://graph.facebook.com/v19.0/${instagramBusinessId}/media`;
  const containerBody = {
    image_url: imageUrl,
    caption: caption || "",
    access_token: facebookPageAccessToken,
  };

  console.log(`Creating Instagram media container for business ID: ${instagramBusinessId}`);
  const containerRes = await fetch(containerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(containerBody),
  });

  const containerData = await containerRes.json();
  if (!containerRes.ok) {
    console.error("Instagram Container Creation Error:", containerData);
    throw new Error(containerData.error?.message || "Failed to create Instagram media container");
  }

  const containerId = containerData.id;
  console.log(`Instagram container created: ${containerId}. Polling status...`);

  // Step 2: Poll Container Status
  let status = "IN_PROGRESS";
  let attempts = 0;
  const maxAttempts = 12; // 60 seconds total

  while (status === "IN_PROGRESS" && attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    attempts++;

    const statusUrl = `https://graph.facebook.com/v19.0/${containerId}?fields=status_code,status&access_token=${facebookPageAccessToken}`;
    const statusRes = await fetch(statusUrl);
    const statusData = await statusRes.json();

    if (!statusRes.ok) {
      console.error(`Instagram status poll attempt ${attempts} failed:`, statusData);
      throw new Error(statusData.error?.message || "Failed to check Instagram media status");
    }

    status = statusData.status_code;
    console.log(`Instagram status poll attempt ${attempts}: ${status}`);

    if (status === "ERROR") {
      throw new Error(statusData.status || "Instagram media container processing failed");
    }
  }

  if (status !== "FINISHED") {
    throw new Error("Instagram media container creation timed out");
  }

  // Step 3: Publish Media Container
  const publishUrl = `https://graph.facebook.com/v19.0/${instagramBusinessId}/media_publish`;
  const publishBody = {
    creation_id: containerId,
    access_token: facebookPageAccessToken,
  };

  console.log(`Publishing Instagram media container: ${containerId}`);
  const publishRes = await fetch(publishUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(publishBody),
  });

  const publishData = await publishRes.json();
  if (!publishRes.ok) {
    console.error("Instagram Publishing Error:", publishData);
    throw new Error(publishData.error?.message || "Failed to publish media on Instagram");
  }

  return publishData.id;
};
