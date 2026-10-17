import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  AUTH_LIMITS,
  authenticate,
  createUser,
  ensureCreatorAccount,
  hashPassword,
  normalizeUsername,
  recordAuditEntry,
  validatePassword,
} from "../../src/auth.js";

function createFakePrisma(initialUser) {
  const users = initialUser ? [structuredClone(initialUser)] : [];
  const auditEntries = [];
  const findUser = (where) =>
    users.find((user) => user.id === where.id || user.username === where.username) ?? null;
  const transaction = {
    user: {
      findUnique: async ({ where }) => {
        const user = findUser(where);
        return user ? structuredClone(user) : null;
      },
      update: async ({ where, data }) => {
        const user = findUser(where);
        Object.assign(user, data);
        return structuredClone(user);
      },
      create: async ({ data }) => {
        const user = { id: "creator-id", ...data };
        users.push(user);
        return structuredClone(user);
      },
    },
    auditEntry: {
      create: async ({ data }) => {
        const entry = { id: `audit-${auditEntries.length + 1}`, ...data };
        auditEntries.push(entry);
        return structuredClone(entry);
      },
      count: async () => auditEntries.length,
      findMany: async () => [],
      deleteMany: async () => ({ count: 0 }),
    },
  };

  return {
    user: {
      count: async () => users.length,
      findUnique: async ({ where }) => {
        const user = findUser(where);
        return user ? structuredClone(user) : null;
      },
    },
    $transaction: async (callback) => callback(transaction),
    inspect: () => ({
      users: structuredClone(users),
      auditEntries: structuredClone(auditEntries),
    }),
  };
}

describe("Zion authentication unit tests", () => {
  test("normalizes usernames for case-insensitive identity", () => {
    assert.equal(normalizeUsername("  Creator  "), "creator");
    assert.equal(normalizeUsername("Alice_01"), "alice_01");
  });

  test("rejects usernames outside the documented character and length policy", () => {
    for (const username of ["ab", "a".repeat(33), "bad name", "admin!"]) {
      assert.throws(() => normalizeUsername(username), TypeError);
    }
    assert.throws(() => normalizeUsername(null), TypeError);
  });

  test("enforces strong bounded password length", () => {
    validatePassword("strong-passphrase");
    assert.throws(() => validatePassword("short"), TypeError);
    assert.throws(() => validatePassword("x".repeat(129)), TypeError);
    assert.throws(() => validatePassword(null), TypeError);
    assert.equal(AUTH_LIMITS.passwordMinLength, 12);
    assert.equal(AUTH_LIMITS.passwordMaxLength, 128);
  });

  test("hashes password with unique salt without retaining plaintext", async () => {
    const password = "secret-passphrase-2026";
    const firstHash = await hashPassword(password);
    const secondHash = await hashPassword(password);

    assert.match(firstHash, /^scrypt\$16384\$8\$1\$/);
    assert.notEqual(firstHash, secondHash);
    assert.doesNotMatch(firstHash, new RegExp(password));
  });

  test("authenticates case-insensitive usernames and clears prior failures", async () => {
    const password = "correct-horse-battery";
    const user = {
      id: "user-1",
      username: "alice",
      role: "USER",
      isActive: true,
      passwordHash: await hashPassword(password),
      failedLoginAttempts: 3,
      lockedUntil: null,
    };
    const prisma = createFakePrisma(user);

    assert.deepEqual(await authenticate(prisma, " ALICE ", password), {
      id: "user-1",
      username: "alice",
      role: "USER",
    });
    const state = prisma.inspect();
    assert.equal(state.users[0].failedLoginAttempts, 0);
    assert.equal(state.users[0].lockedUntil, null);
    assert.deepEqual(state.auditEntries.map(({ action }) => action), ["LOGIN_SUCCESS"]);
  });

  test("counts invalid credentials and locks the account on the fifth failure", async () => {
    const now = new Date("2026-10-17T12:00:00.000Z");
    const prisma = createFakePrisma({
      id: "user-1",
      username: "alice",
      role: "USER",
      isActive: true,
      passwordHash: await hashPassword("correct-horse-battery"),
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    for (let attempt = 1; attempt < AUTH_LIMITS.maxLoginFailures; attempt += 1) {
      assert.equal(await authenticate(prisma, "alice", "wrong-password", now), null);
      assert.equal(prisma.inspect().users[0].failedLoginAttempts, attempt);
      assert.equal(prisma.inspect().users[0].lockedUntil, null);
    }

    assert.equal(await authenticate(prisma, "alice", "wrong-password", now), null);
    const state = prisma.inspect();
    assert.equal(state.users[0].failedLoginAttempts, 0);
    assert.equal(
      state.users[0].lockedUntil.getTime(),
      now.getTime() + AUTH_LIMITS.lockoutDurationMs,
    );
    assert.equal(state.auditEntries.at(-1).action, "LOGIN_LOCKOUT");
  });

  test("does not authenticate disabled or currently locked accounts", async () => {
    const password = "correct-horse-battery";
    const passwordHash = await hashPassword(password);
    const now = new Date("2026-10-17T12:00:00.000Z");

    for (const user of [
      {
        id: "disabled",
        username: "alice",
        role: "USER",
        isActive: false,
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      {
        id: "locked",
        username: "alice",
        role: "USER",
        isActive: true,
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: new Date(now.getTime() + AUTH_LIMITS.lockoutDurationMs),
      },
    ]) {
      const prisma = createFakePrisma(user);
      assert.equal(await authenticate(prisma, "alice", password, now), null);
      assert.deepEqual(prisma.inspect().auditEntries, []);
    }
  });

  test("expired lock starts a fresh failure count", async () => {
    const now = new Date("2026-10-17T12:00:00.000Z");
    const prisma = createFakePrisma({
      id: "user-1",
      username: "alice",
      role: "USER",
      isActive: true,
      passwordHash: await hashPassword("correct-horse-battery"),
      failedLoginAttempts: 0,
      lockedUntil: new Date(now.getTime() - 1),
    });

    assert.equal(await authenticate(prisma, "alice", "wrong-password", now), null);
    assert.equal(prisma.inspect().users[0].failedLoginAttempts, 1);
    assert.equal(prisma.inspect().users[0].lockedUntil, null);
    assert.equal(prisma.inspect().auditEntries[0].action, "LOGIN_FAILURE");
  });

  test("uses a generic rejection for missing usernames and malformed names", async () => {
    const prisma = createFakePrisma(null);

    assert.equal(await authenticate(prisma, "missing", "arbitrary-password"), null);
    assert.equal(await authenticate(prisma, "\u202eattacker", "arbitrary-password"), null);
    assert.deepEqual(prisma.inspect(), { users: [], auditEntries: [] });
  });

  test("rejects malformed stored password hashes without authenticating", async () => {
    const prisma = createFakePrisma({
      id: "user-1",
      username: "alice",
      role: "USER",
      isActive: true,
      passwordHash: "plaintext-password",
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    assert.equal(await authenticate(prisma, "alice", "plaintext-password"), null);
    assert.equal(prisma.inspect().users[0].failedLoginAttempts, 1);
    assert.deepEqual(prisma.inspect().auditEntries.map(({ action }) => action), ["LOGIN_FAILURE"]);
  });

  test("does not allow non-master actors to create users", async () => {
    await assert.rejects(
      createUser({}, { id: "user-id", role: "USER" }, "alice", "password-strong-1", "password-strong-1"),
      /Apenas o Admin Master/,
    );
  });

  test("records supported defensive login limits", () => {
    assert.equal(AUTH_LIMITS.maxLoginFailures, 5);
    assert.equal(AUTH_LIMITS.lockoutDurationMs, 15 * 60 * 1000);
  });

  test("rejects Creator password mismatch before opening a database transaction", async () => {
    let transactionStarted = false;
    const prisma = {
      user: {
        count: async () => 0,
      },
      $transaction: async () => {
        transactionStarted = true;
      },
    };

    await assert.rejects(
      ensureCreatorAccount(prisma, {
        password: "creator-passphrase",
        confirmPassword: "different-passphrase",
      }),
      /senhas não coincidem/,
    );
    assert.equal(transactionStarted, false);
  });

  test("refuses to bootstrap a second master over an existing non-Creator account", async () => {
    const prisma = {
      user: {
        count: async () => 1,
        findUnique: async () => null,
      },
      $transaction: async () => {
        assert.fail("must not start a Creator bootstrap transaction");
      },
    };

    await assert.rejects(
      ensureCreatorAccount(prisma, {}),
      /a conta Creator não existe/,
    );
  });

  test("rejects free-form audit actions before database writes", async () => {
    let transactionStarted = false;
    const prisma = {
      $transaction: async () => {
        transactionStarted = true;
      },
    };

    await assert.rejects(
      recordAuditEntry(prisma, "user-id", "LOGIN_SUCCESS; DROP TABLE User"),
      TypeError,
    );
    assert.equal(transactionStarted, false);
  });

  test("reserves the Creator identity for the master account", async () => {
    await assert.rejects(
      createUser(
        {},
        { id: "master-id", role: "MASTER" },
        " Creator ",
        "valid-user-password",
        "valid-user-password",
      ),
      /reservado para o Admin Master/,
    );
  });

  test("requires matching credentials before creating a regular account", async () => {
    let transactionStarted = false;
    const prisma = {
      $transaction: async () => {
        transactionStarted = true;
      },
    };

    await assert.rejects(
      createUser(
        prisma,
        { id: "master-id", role: "MASTER" },
        "alice",
        "valid-user-password",
        "different-user-password",
      ),
      /senhas não coincidem/,
    );
    assert.equal(transactionStarted, false);
  });
});
