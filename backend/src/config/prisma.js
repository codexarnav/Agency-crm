import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
const { Pool } = pg;
import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production" ||
    (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost"));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
    adapter,
    log: ["query", "info", "warn", "error"],
});

export default prisma;