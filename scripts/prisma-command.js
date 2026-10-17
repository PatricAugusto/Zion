import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));
const databaseDirectory = resolve(projectRoot, "data");
mkdirSync(databaseDirectory, { recursive: true });
process.env.DATABASE_URL ??=
  `file:${resolve(databaseDirectory, "zion.db").replaceAll("\\", "/")}`;

const prismaCli = resolve(projectRoot, "node_modules", "prisma", "build", "index.js");
const result = spawnSync(
  process.execPath,
  [prismaCli, ...process.argv.slice(2)],
  {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(`Falha ao executar o Prisma: ${result.error.message}`);
  process.exitCode = 1;
} else if (result.signal) {
  console.error(`Prisma interrompido pelo sinal ${result.signal}.`);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
