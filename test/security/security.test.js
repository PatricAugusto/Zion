import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import {
  renderAlertAnalysis,
  renderAlerts,
  renderAnalysis,
  renderAuditEntries,
  renderDashboard,
  renderLearning,
  renderObservability,
  renderObjects,
  renderProtocols,
  renderSessionLog,
  renderSectorAnalysis,
  renderAdminUsers,
} from "../../src/dashboard.js";
import { createSessionLog } from "../../src/session-log.js";
import { createCliTestContext } from "../../scripts/cli-test-support.js";

const creatorPassword = "CreatorPassphrase#2026";
const renderers = [
  renderDashboard,
  renderObjects,
  renderAlerts,
  renderAnalysis,
  renderSectorAnalysis,
  renderAlertAnalysis,
  renderObservability,
  renderLearning,
  renderProtocols,
  () => renderSessionLog(createSessionLog().read()),
  () => renderAdminUsers([]),
  () => renderAuditEntries([]),
];
let cli;

describe("Zion security regression tests", () => {
  before(() => {
    cli = createCliTestContext();
  });

  after(() => {
    cli.close();
  });

  test("hostile menu input is rejected without being echoed or interpreted", () => {
    const marker = "ZION_INPUT_MUST_NOT_BE_EVALUATED";
    const hostileInputs = [
      "__proto__",
      "constructor",
      "toString",
      "q;process.exit(99)",
      `\u001b[2J${marker}`,
      `\u001b]0;${marker}\u0007`,
      `\u202e${marker}\u2066`,
      "x".repeat(64 * 1024),
    ];
    const result = cli.run(
      `${creatorPassword}\n${creatorPassword}\n${hostileInputs.join("\n")}\nq\n`,
    ).result;

    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    assert.equal((result.stdout.match(/Opção inválida/g) ?? []).length, hostileInputs.length);
    assert.doesNotMatch(result.stdout, new RegExp(marker));
    assert.doesNotMatch(result.stdout, /\u001b/);
    assert.match(result.stdout, /Zion encerrado\. Nenhuma ação externa foi executada\./);
  });

  test("menu-input flood is bounded and its payload is not echoed", () => {
    const marker = "FLOOD_PAYLOAD_MUST_NOT_BE_ECHOED";
    const result = cli.run(
      `${creatorPassword}\n${creatorPassword}\n${`${marker}\n`.repeat(1000)}q\n`,
    ).result;

    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Limite de 10 entradas inválidas consecutivas atingido/);
    assert.equal((result.stdout.match(/Opção inválida/g) ?? []).length, 9);
    assert.doesNotMatch(result.stdout, new RegExp(marker));
    assert.ok(result.stdout.length < 50_000);
  });

  test("all screens emit no terminal control characters when colors are disabled", () => {
    for (const render of renderers) {
      const output = render(false);

      assert.doesNotMatch(output, /\u001b/);
      assert.doesNotMatch(output, /[\u0000-\u0009\u000b-\u001f\u007f]/);
    }
  });

  test("colored screens use only the fixed allowlisted SGR sequences", () => {
    const allowedSgr = /\u001b\[(?:0|2|92|95|96|1;96)m/g;

    for (const render of renderers) {
      const output = render(true);
      const withoutAllowedSgr = output.replace(allowedSgr, "");

      assert.doesNotMatch(withoutAllowedSgr, /\u001b/);
      assert.doesNotMatch(withoutAllowedSgr, /[\u0000-\u0008\u000b-\u001f\u007f]/);
      assert.doesNotMatch(output, /\u001b\][\s\S]*?(?:\u0007|\u001b\\)/);
    }
  });

  test("dashboard bounds invalid and extreme terminal dimensions", () => {
    for (const columns of [Number.NaN, Number.POSITIVE_INFINITY, -1, 1e100]) {
      assert.doesNotThrow(() => renderDashboard(false, columns));
    }

    assert.ok(renderDashboard(false, Number.NaN).length < 4096);
    assert.ok(renderDashboard(false, 1e100).length < 4096);
  });

  test("admin renderers neutralize terminal control and bidirectional text", () => {
    const payload = "\u001b]0;INJECT\u0007\u202e";
    const users = renderAdminUsers([
      { username: payload, role: "USER", isActive: true, lockedUntil: null },
    ]);
    const audit = renderAuditEntries([
      { createdAt: new Date("2026-10-12T12:00:00.000Z"), actor: payload, action: payload },
    ]);

    for (const output of [users, audit]) {
      assert.doesNotMatch(output, /\u001b/);
      assert.doesNotMatch(output, /[\u0000-\u0009\u000b-\u001f\u007f\u202e]/);
      assert.match(output, /\?/);
    }
  });
});
