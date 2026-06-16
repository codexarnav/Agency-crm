import dotenv from "dotenv";

dotenv.config();

export const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

export const getRedisOptions = () => {
  const isTls = REDIS_URL.startsWith("rediss://");
  return {
    maxRetriesPerRequest: null,
    tls: isTls ? { rejectUnauthorized: false } : undefined,
  };
};
