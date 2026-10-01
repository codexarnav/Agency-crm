/// <reference types="node" />
import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl = process.env["DATABASE_URL"];
const studioDatabaseUrl = databaseUrl ? new URL(databaseUrl) : null;
if (
  studioDatabaseUrl &&
  !["localhost", "127.0.0.1", "::1", "[::1]"].includes(studioDatabaseUrl.hostname) &&
  !studioDatabaseUrl.searchParams.has("sslmode")
) {
  studioDatabaseUrl.searchParams.set("sslmode", "require");
}

export default defineConfig({
  schema: "db/prisma/schema.prisma",
  migrations: {
    path: "db/prisma/migrations",
  },
  datasource: {
    url: studioDatabaseUrl?.toString(),
  },
});
