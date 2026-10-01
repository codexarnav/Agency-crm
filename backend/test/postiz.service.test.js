import assert from "node:assert/strict";
import test from "node:test";

import {
    getConnectionUrl,
    publishPost,
    toCrmPlatform,
    toPostizPlatform,
} from "../src/services/postiz.service.js";

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
});

test("Postiz adapter authenticates, normalizes platforms, uploads media, and publishes", async (t) => {
    const originalFetch = globalThis.fetch;
    const originalApiKey = process.env.POSTIZ_API_KEY;
    const originalApiUrl = process.env.POSTIZ_API_URL;

    process.env.POSTIZ_API_KEY = "test-postiz-key";
    process.env.POSTIZ_API_URL = "http://postiz.test/api/public/v1/";

    t.after(() => {
        globalThis.fetch = originalFetch;
        if (originalApiKey === undefined) delete process.env.POSTIZ_API_KEY;
        else process.env.POSTIZ_API_KEY = originalApiKey;
        if (originalApiUrl === undefined) delete process.env.POSTIZ_API_URL;
        else process.env.POSTIZ_API_URL = originalApiUrl;
    });

    assert.equal(toPostizPlatform("Twitter"), "x");
    assert.equal(toCrmPlatform("x"), "twitter");

    const requests = [];
    const responses = [
        jsonResponse({ url: "https://postiz.test/connect/x" }),
        jsonResponse({ id: "media-1", path: "/uploads/video.mp4" }),
        jsonResponse([{ id: "post-1" }]),
    ];
    globalThis.fetch = async (url, options = {}) => {
        requests.push({ url, options });
        return responses.shift();
    };

    const connectionUrl = await getConnectionUrl("twitter");
    assert.equal(connectionUrl, "https://postiz.test/connect/x");

    const published = await publishPost(
        "integration-1",
        "A launch update",
        ["https://cdn.test/video.mp4"],
        "Launch video",
        "youtube"
    );
    assert.deepEqual(published, { id: "post-1", status: "PUBLISHED" });

    assert.equal(requests.length, 3);
    for (const request of requests) {
        assert.equal(request.options.headers.Authorization, "test-postiz-key");
        assert.notEqual(request.options.headers.Authorization, "Bearer test-postiz-key");
    }
    assert.equal(requests[0].url, "http://postiz.test/api/public/v1/social/x");
    assert.equal(requests[1].url, "http://postiz.test/api/public/v1/upload-from-url");
    assert.deepEqual(JSON.parse(requests[1].options.body), {
        url: "https://cdn.test/video.mp4",
    });

    const createRequest = JSON.parse(requests[2].options.body);
    assert.equal(requests[2].url, "http://postiz.test/api/public/v1/posts");
    assert.equal(createRequest.type, "now");
    assert.deepEqual(createRequest.posts[0].integration, { id: "integration-1" });
    assert.deepEqual(createRequest.posts[0].value[0].image, [
        { id: "media-1", path: "/uploads/video.mp4" },
    ]);
    assert.deepEqual(createRequest.posts[0].settings, {
        __type: "youtube",
        title: "Launch video",
        type: "public",
        selfDeclaredMadeForKids: "no",
        tags: [],
    });
});
