import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import {
  authenticate,
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

  test("simultaneous first-run bootstraps create exactly one Creator account", async () => {
    const databaseUrl = context.createDatabaseUrl();
    const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    const secondPrisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
    await prisma.$connect();
    await secondPrisma.$connect();

    try {
      const results = await Promise.allSettled(
        Array.from({ length: 4 }, (_, index) =>
          ensureCreatorAccount(index % 2 === 0 ? prisma : secondPrisma, {
            password: creatorPassword,
            confirmPassword: creatorPassword,
          }),
        ),
      );
      const successfulSetups = results.filter(
        (result) => result.status === "fulfilled" && result.value === true,
      );

      assert.equal(successfulSetups.length, 1);
      assert.equal(await prisma.user.count({ where: { role: "MASTER" } }), 1);
      assert.equal(await prisma.user.count(), 1);
      assert.equal(await prisma.auditEntry.count(), 1);
    } finally {
      await prisma.$disconnect();
      await secondPrisma.$disconnect();
    }
  });

  test("parallel duplicate account requests preserve unique username constraint", async () => {
    const databaseUrl = context.createDatabaseUrl();
    const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    const secondPrisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
    await prisma.$connect();
    await secondPrisma.$connect();

    try {
      await ensureCreatorAccount(prisma, {
        password: creatorPassword,
        confirmPassword: creatorPassword,
      });
      const creator = await prisma.user.findUnique({ where: { username: "creator" } });
      const results = await Promise.allSettled(
        Array.from({ length: 4 }, (_, index) =>
          createUser(
            index % 2 === 0 ? prisma : secondPrisma,
            { id: creator.id, role: "MASTER" },
            "parallel-user",
            "ParallelUserPassphrase#2026",
            "ParallelUserPassphrase#2026",
          ),
        ),
      );

      assert.equal(results.filter(({ status }) => status === "fulfilled").length, 1);
      assert.equal(
        results.filter(
          (result) => result.status === "rejected" && result.reason.code === "P2002",
        ).length,
        3,
      );
      assert.equal(await prisma.user.count({ where: { username: "parallel-user" } }), 1);
      assert.equal(await prisma.auditEntry.count(), 2);
    } finally {
      await prisma.$disconnect();
      await secondPrisma.$disconnect();
    }
  });

  test("parallel bad logins cannot lose failed-attempt increments", async () => {
    const databaseUrl = context.createDatabaseUrl();
    const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    const secondPrisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
    await prisma.$connect();
    await secondPrisma.$connect();

    try {
      await ensureCreatorAccount(prisma, {
        password: creatorPassword,
        confirmPassword: creatorPassword,
      });
      const results = await Promise.allSettled(
        Array.from({ length: 5 }, (_, index) =>
          authenticate(
            index % 2 === 0 ? prisma : secondPrisma,
            "creator",
            "WrongPassphrase#2026",
          ),
        ),
      );
      const account = await prisma.user.findUnique({
        where: { username: "creator" },
      });

      assert.equal(results.filter(({ status }) => status === "fulfilled").length, 5);
      assert.equal(results.filter(
        ({ status, value }) => status === "fulfilled" && value === null,
      ).length, 5);
      assert.equal(account.failedLoginAttempts, 0);
      assert.ok(account.lockedUntil instanceof Date);
      assert.equal(await prisma.auditEntry.count({ where: { action: "LOGIN_LOCKOUT" } }), 1);
    } finally {
      await prisma.$disconnect();
      await secondPrisma.$disconnect();
    }
  });
});
