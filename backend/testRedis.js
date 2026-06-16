import Redis from "ioredis";

const redis = new Redis(
    'rediss://default:gQAAAAAAAZYZAAIgcDE5NWQzYjViOTgzZWY0NThlYTcyOTRhMGMyMzhiMGVlNA@fancy-walleye-103961.upstash.io:6379',
    {
        maxRetriesPerRequest: null,
        tls: { rejectUnauthorized: false }
    }
);

(async () => {
    try {
        console.log("Connecting to Redis...");

        const pong = await redis.ping();
        console.log("PING:", pong);

        console.log("Testing WRITE access...");

        await redis.set("orbit:test", "hello");

        const value = await redis.get("orbit:test");

        console.log("GET orbit:test =", value);

        await redis.del("orbit:test");

        console.log("✅ SUCCESS: Redis Read + Write works");

    } catch (err) {
        console.error("❌ REDIS ERROR:");
        console.error(err);
    } finally {
        redis.disconnect();
        process.exit(0);
    }
})();