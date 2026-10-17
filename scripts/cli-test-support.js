import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const entryPoint = resolve(projectRoot, "src", "main.js");
const prismaCli = resolve(projectRoot, "node_modules", "prisma", "build", "index.js");

export function createCliTestContext() {
  const directory = mkdtempSync(join(tmpdir(), "zion-cli-test-"));
  const templateDatabase = join(directory, "template.db");
  const templateUrl = `file:${templateDatabase.replaceAll("\\", "/")}`;
  const migration = spawnSync(
    process.execPath,
    [prismaCli, "migrate", "deploy"],
    {
      cwd: projectRoot,
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: templateUrl },
      timeout: 60000,
    },
  );

  assert.equal(migration.error, undefined, migration.stderr);
  assert.equal(migration.status, 0, migration.stderr);
  let databaseNumber = 0;
  const createDatabaseUrl = () => {
    const databasePath = join(directory, `run-${databaseNumber++}.db`);
    copyFileSync(templateDatabase, databasePath);
    return `file:${databasePath.replaceAll("\\", "/")}`;
  };

  return {
    run(input, databaseUrl) {
      const currentDatabaseUrl = databaseUrl ?? createDatabaseUrl();
      return {
        databaseUrl: currentDatabaseUrl,
        result: spawnSync(process.execPath, [entryPoint], {
          cwd: projectRoot,
          encoding: "utf8",
          env: { ...process.env, DATABASE_URL: currentDatabaseUrl },
          input,
          timeout: 30000,
          maxBuffer: 1024 * 1024,
        }),
      };
    },

    createDatabaseUrl,

    close() {
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
