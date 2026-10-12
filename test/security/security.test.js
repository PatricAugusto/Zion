import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  renderAlertAnalysis,
  renderAlerts,
  renderAnalysis,
  renderDashboard,
  renderLearning,
  renderObservability,
  renderObjects,
  renderProtocols,
  renderSectorAnalysis,
} from "../../src/dashboard.js";

const entryPoint = fileURLToPath(new URL("../../src/main.js", import.meta.url));
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
];

describe("Zion security regression tests", () => {

function runCli(input) {
  return spawnSync(process.execPath, [entryPoint], {
    encoding: "utf8",
    input,
    timeout: 5000,
    maxBuffer: 1024 * 1024,
  });
}

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
  const result = runCli(`${hostileInputs.join("\n")}\nq\n`);

  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal((result.stdout.match(/Opção inválida/g) ?? []).length, hostileInputs.length);
  assert.doesNotMatch(result.stdout, new RegExp(marker));
  assert.doesNotMatch(result.stdout, /\u001b/);
  assert.match(result.stdout, /Zion encerrado\. Nenhuma ação externa foi executada\./);
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

});
