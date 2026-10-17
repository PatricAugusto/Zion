import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const databaseDirectory = resolve(projectRoot, "data");

await mkdir(databaseDirectory, { recursive: true });
process.env.DATABASE_URL ??=
  `file:${resolve(databaseDirectory, "zion.db").replaceAll("\\", "/")}`;

export const prisma = new PrismaClient();
