import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createSessionLog } from "../../src/session-log.js";

describe("Zion session log unit tests", () => {
  test("records allowlisted events with deterministic UTC timestamps", () => {
    const sessionLog = createSessionLog(
      () => new Date("2026-10-12T12:00:00.000Z"),
    );

    sessionLog.record("APP_STARTED");
    sessionLog.record("SCREEN_OPENED", "OBSERVABILITY");
    sessionLog.record("INVALID_INPUT");

    assert.deepEqual(sessionLog.read().entries, [
      {
        sequence: 1,
        timestamp: "2026-10-12T12:00:00.000Z",
        level: "INFO",
        message: "Sessão Zion iniciada.",
      },
      {
        sequence: 2,
        timestamp: "2026-10-12T12:00:00.000Z",
        level: "INFO",
        message: "Tela aberta: Séries de observabilidade.",
      },
      {
        sequence: 3,
        timestamp: "2026-10-12T12:00:00.000Z",
        level: "AVISO",
        message: "Entrada de menu rejeitada.",
      },
    ]);
  });

  test("rejects unknown event and screen identifiers instead of logging raw text", () => {
    const sessionLog = createSessionLog();

    assert.throws(
      () => sessionLog.record("SCREEN_OPENED", "\u001b]0;hostile\u0007"),
      { name: "TypeError" },
    );
    assert.throws(
      () => sessionLog.record("USER_INPUT: secret"),
      { name: "TypeError" },
    );
    assert.equal(sessionLog.read().entries.length, 0);
  });

  test("records menu lockout with a fixed message and never stores attempted input", () => {
    const sessionLog = createSessionLog();

    sessionLog.record("INVALID_INPUT");
    sessionLog.record("INPUT_LIMIT_REACHED");

    assert.equal(
      sessionLog.read().entries.at(-1).message,
      "Sessão encerrada após entradas inválidas consecutivas.",
    );
  });

  test("rejects an invalid clock without adding an entry", () => {
    const sessionLog = createSessionLog(() => new Date(Number.NaN));

    assert.throws(() => sessionLog.record("APP_STARTED"), TypeError);
    assert.equal(sessionLog.read().entries.length, 0);
  });

  test("retains at most 50 entries and counts discarded entries", () => {
    let tick = 0;
    const sessionLog = createSessionLog(
      () => new Date(Date.UTC(2026, 9, 12, 12, 0, 0, tick++)),
    );

    for (let index = 0; index < 55; index += 1) {
      sessionLog.record("INVALID_INPUT");
    }

    const snapshot = sessionLog.read();
    assert.equal(snapshot.capacity, 50);
    assert.equal(snapshot.entries.length, 50);
    assert.equal(snapshot.discardedCount, 5);
    assert.equal(snapshot.entries[0].sequence, 6);
    assert.equal(snapshot.entries.at(-1).sequence, 55);
  });

  test("returns immutable snapshots that cannot alter the internal log", () => {
    const sessionLog = createSessionLog();
    sessionLog.record("APP_STARTED");
    const snapshot = sessionLog.read();

    assert.throws(() => snapshot.entries.push({ message: "tampered" }), TypeError);
    assert.throws(() => {
      snapshot.entries[0].message = "tampered";
    }, TypeError);
    assert.equal(sessionLog.read().entries[0].message, "Sessão Zion iniciada.");
  });
});
