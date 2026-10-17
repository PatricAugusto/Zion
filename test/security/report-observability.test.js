import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  renderTestReport,
  summarizeTestResults,
} from "../../scripts/test-report.js";

const output = [
  "▶ Autenticação e acesso",
  "  ✔ login válido não revela hash (1ms)",
  "  ✖ bloqueia tentativas inválidas (2ms)",
  "  ﹣ caso reservado",
  "✔ Autenticação e acesso (4ms)",
  "▶ Entradas de terminal",
  "  ✔ senha não ecoada (1ms)",
  "✔ Entradas de terminal (1ms)",
  "ℹ tests 3",
  "ℹ pass 2",
  "ℹ fail 1",
  "ℹ cancelled 0",
  "ℹ skipped 0",
  "ℹ todo 0",
  "ℹ duration_ms 55.5",
].join("\n");

describe("Zion test observability suite", () => {
  test("summarizes suite-level pass, failure, and skipped counts", () => {
    const summary = summarizeTestResults(output);

    assert.equal(summary.tests, 3);
    assert.equal(summary.passed, 2);
    assert.equal(summary.failed, 1);
    assert.equal(summary.durationMs, 55.5);
    assert.deepEqual(summary.suites, [
      {
        name: "Autenticação e acesso",
        passed: 1,
        failed: 1,
        skipped: 1,
      },
      {
        name: "Entradas de terminal",
        passed: 1,
        failed: 0,
        skipped: 0,
      },
    ]);
  });

  test("fails closed when runner summary fields are missing", () => {
    assert.equal(summarizeTestResults("tests completed"), null);
  });

  test("renders a compact aligned suite report without ANSI by default", () => {
    const report = renderTestReport(summarizeTestResults(output));

    assert.match(report, /VISÃO GERAL DOS TESTES/);
    assert.match(report, /TOTAL 3\s+·\s+PASSOU 2\s+·\s+FALHOU 1/);
    assert.match(report, /APROVAÇÃO/);
    assert.match(report, /RESULTADOS POR SUÍTE/);
    assert.match(report, /SUÍTE\s+PASS\s+FALHA\s+IGN\./);
    assert.match(report, /Autenticação e acesso\s+1\s+1\s+1/);
    assert.match(report, /Entradas de terminal\s+1\s+0\s+0/);
    assert.doesNotMatch(report, /\u001b/);
  });

  test("uses only fixed SGR colors when color output is requested", () => {
    const report = renderTestReport(summarizeTestResults(output), {
      useColor: true,
    });
    const withoutAllowedSgr = report.replace(
      /\u001b\[(?:0|91|92|96|1;96)m/g,
      "",
    );

    assert.match(report, /\u001b\[91m/);
    assert.doesNotMatch(withoutAllowedSgr, /\u001b/);
  });
});
