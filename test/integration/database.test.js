import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import {
  createUser,
  ensureCreatorAccount,
  listAuditEntries,
  listUsers,
  recordAuditEntry,
} from "../../src/auth.js";
import { createCliTestContext } from "../../scripts/cli-test-support.js";

const creatorPassword = "CreatorPassphrase#2026";
let context;

describe("Zion SQLite persistence and transaction tests", () => {
  before(() => {
    context = createCliTestContext();
  });

  after(() => {
    context.close();
  });

  test("provisions Creator and commits account plus audit entry together", async () => {
    const databaseUrl = context.createDatabaseUrl();
    const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();

    try {
      assert.equal(
        await ensureCreatorAccount(prisma, {
          password: creatorPassword,
          confirmPassword: creatorPassword,
        }),
        true,
      );
      const creator = await prisma.user.findUnique({ where: { username: "creator" } });
      assert.equal(creator.role, "MASTER");
      assert.notEqual(creator.passwordHash, creatorPassword);
      assert.equal(creator.passwordHash.startsWith("scrypt$"), true);
      assert.equal(await ensureCreatorAccount(prisma, {}), false);
      assert.equal(await prisma.auditEntry.count(), 1);
    } finally {
      await prisma.$disconnect();
    }
  });

  test("rolls back account creation when its audit write fails", async () => {
    const databaseUrl = context.createDatabaseUrl();
    const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();

    try {
      await ensureCreatorAccount(prisma, {
        password: creatorPassword,
        confirmPassword: creatorPassword,
      });
      const creator = await prisma.user.findUnique({ where: { username: "creator" } });
      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER "reject_user_audit"
        BEFORE INSERT ON "AuditEntry"
        WHEN NEW.action = 'USER_CREATED'
        BEGIN
          SELECT RAISE(ABORT, 'audit unavailable');
        END;
      `);

      await assert.rejects(
        createUser(
          prisma,
          { id: creator.id, role: creator.role },
          "alice",
          "AlicePassword#2026",
          "AlicePassword#2026",
        ),
      );
      assert.equal(await prisma.user.findUnique({ where: { username: "alice" } }), null);
      assert.equal(await prisma.auditEntry.count(), 1);
    } finally {
      await prisma.$disconnect();
    }
  });

  test("only master can inspect user accounts and persistent audit entries", async () => {
    const databaseUrl = context.createDatabaseUrl();
    const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();

    try {
      await ensureCreatorAccount(prisma, {
        password: creatorPassword,
        confirmPassword: creatorPassword,
      });
      const creator = await prisma.user.findUnique({ where: { username: "creator" } });
      await createUser(
        prisma,
        { id: creator.id, role: "MASTER" },
        "alice",
        "AlicePassword#2026",
        "AlicePassword#2026",
      );

      const users = await listUsers(prisma, { id: creator.id, role: "MASTER" });
      assert.deepEqual(users.map(({ username, role }) => [username, role]), [
        ["creator", "MASTER"],
        ["alice", "USER"],
      ]);
      const audit = await listAuditEntries(prisma, { id: creator.id, role: "MASTER" });
      assert.deepEqual(audit.map(({ action }) => action), [
        "Conta de usuário criada",
        "Administrador Creator provisionado",
      ]);
      await assert.rejects(listUsers(prisma, { id: "alice", role: "USER" }), /Admin Master/);
      await assert.rejects(listAuditEntries(prisma, { id: "alice", role: "USER" }), /Admin Master/);
    } finally {
      await prisma.$disconnect();
    }
  });

  test("retains no more than ten thousand audit records", async () => {
    const databaseUrl = context.createDatabaseUrl();
    const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();

    try {
      await prisma.$executeRawUnsafe(`
        WITH RECURSIVE sequence(number) AS (
          SELECT 1
          UNION ALL
          SELECT number + 1 FROM sequence WHERE number < 10001
        )
        INSERT INTO "AuditEntry" ("id", "action", "createdAt")
        SELECT 'seed-' || number, 'SESSION_ENDED', CURRENT_TIMESTAMP
        FROM sequence;
      `);

      const newestAuditEntry = await recordAuditEntry(prisma, null, "SESSION_ENDED");
      assert.equal(await prisma.auditEntry.count(), 10_000);
      assert.ok(await prisma.auditEntry.findUnique({ where: { id: newestAuditEntry.id } }));
    } finally {
      await prisma.$disconnect();
    }
  });
});
