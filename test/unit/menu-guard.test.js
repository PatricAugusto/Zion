import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  createMenuAttemptGuard,
  MAX_CONSECUTIVE_INVALID_ATTEMPTS,
} from "../../src/menu-guard.js";

describe("Zion menu attempt guard unit tests", () => {
  test("allows invalid attempts below the configured limit", () => {
    const guard = createMenuAttemptGuard();

    for (let attempt = 1; attempt < MAX_CONSECUTIVE_INVALID_ATTEMPTS; attempt += 1) {
      assert.equal(guard.recordInvalidAttempt(), false);
    }
  });

  test("reaches the limit on the configured consecutive invalid attempt", () => {
    const guard = createMenuAttemptGuard();

    for (let attempt = 1; attempt < MAX_CONSECUTIVE_INVALID_ATTEMPTS; attempt += 1) {
      guard.recordInvalidAttempt();
    }

    assert.equal(guard.recordInvalidAttempt(), true);
    assert.equal(guard.recordInvalidAttempt(), true);
  });

  test("a valid menu choice resets the consecutive-attempt counter", () => {
    const guard = createMenuAttemptGuard();

    for (let attempt = 1; attempt < MAX_CONSECUTIVE_INVALID_ATTEMPTS - 1; attempt += 1) {
      assert.equal(guard.recordInvalidAttempt(), false);
    }

    guard.recordValidChoice();

    for (let attempt = 1; attempt < MAX_CONSECUTIVE_INVALID_ATTEMPTS; attempt += 1) {
      assert.equal(guard.recordInvalidAttempt(), false);
    }
    assert.equal(guard.recordInvalidAttempt(), true);
  });
});
