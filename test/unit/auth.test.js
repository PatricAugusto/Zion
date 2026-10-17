import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  AUTH_LIMITS,
  createUser,
  hashPassword,
  normalizeUsername,
  validatePassword,
} from "../../src/auth.js";

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

    assert.match(firstHash, /^scrypt\$/);
    assert.notEqual(firstHash, secondHash);
    assert.doesNotMatch(firstHash, new RegExp(password));
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
});
