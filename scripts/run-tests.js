import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const useColor =
  Boolean(process.stdout.isTTY) &&
  process.env.NO_COLOR === undefined &&
  process.env.TERM !== "dumb";

const paint = (text, code) =>
  useColor ? `\u001b[${code}m${text}\u001b[0m` : text;

const banner = [
  "╭────────────────────────────────────────────────────────────╮",
  "│              ZION // SECURE TEST CONSOLE                   │",
  "│          AMBIENTE DE TESTE • EXECUÇÃO LOCAL                 │",
  "├────────────────────────────────────────────────────────────┤",
  "│ [01] TESTES UNITÁRIOS                                       │",
  "│ [02] TESTES DE INTEGRAÇÃO                                   │",
  "│ [03] TESTES DE SEGURANÇA                                    │",
  "│ AUTO-DESCOBERTA ATIVA • RELATÓRIO DETALHADO                 │",
  "╰────────────────────────────────────────────────────────────╯",
].join("\n");

console.log(paint(banner, "96"));

function summarizeResults(output) {
  const count = (name) => {
    const match = output.match(new RegExp(`^ℹ ${name} (\\d+)$`, "m"));
    return match ? Number(match[1]) : null;
  };
  const tests = count("tests");
  const passed = count("pass");
  const failed = count("fail");
  const skipped = count("skipped") ?? 0;
  const cancelled = count("cancelled") ?? 0;
  const todo = count("todo") ?? 0;
  const durationMatch = output.match(/^ℹ duration_ms ([\d.]+)$/m);

  if (tests === null || passed === null || failed === null || !durationMatch) {
    return null;
  }

  const suites = [];
  let currentSuite;
  for (const line of output.split(/\r?\n/)) {
    const start = line.match(/^▶ (.+)$/);
    if (start) {
      currentSuite = { name: start[1], passed: 0, failed: 0, skipped: 0 };
      suites.push(currentSuite);
      continue;
    }
    if (/^[✔✖] /.test(line)) {
      currentSuite = undefined;
      continue;
    }
    const testResult = line.match(/^\s+([✔✖﹣])\s/);
    if (!currentSuite || !testResult) continue;
    if (testResult[1] === "✔") currentSuite.passed += 1;
    else if (testResult[1] === "✖") currentSuite.failed += 1;
    else currentSuite.skipped += 1;
  }

  return {
    tests,
    passed,
    failed,
    skipped,
    cancelled,
    todo,
    durationMs: Number(durationMatch[1]),
    suites,
  };
}

function renderResults(summary) {
  const total = summary.tests;
  const passRatio = total === 0 ? 0 : summary.passed / total;
  const passSlots = Math.round(passRatio * 30);
  const failedSlots = Math.round(
    total === 0 ? 0 : (summary.failed / total) * 30,
  );
  const progress = "#".repeat(passSlots) +
    "!".repeat(failedSlots) +
    ".".repeat(30 - passSlots - failedSlots);
  const suiteRows = summary.suites.map(
    ({ name, passed, failed, skipped }) =>
      `${name.padEnd(34)} ${String(passed).padStart(6)} ${String(failed).padStart(7)} ${String(skipped).padStart(7)}`,
  );
  const lines = [
    "VISÃO GERAL DOS TESTES",
    `TOTAL ${summary.tests}  |  PASSOU ${summary.passed}  |  FALHOU ${summary.failed}`,
    `IGNORADOS ${summary.skipped}  |  CANCELADOS ${summary.cancelled}  |  TODO ${summary.todo}`,
    `APROVAÇÃO [${progress}] ${Math.round(passRatio * 100)}%`,
    "",
    "RESULTADOS POR GRUPO",
    `GRUPO${" ".repeat(29)} PASSOU FALHOU IGNOR.`,
    ...suiteRows,
    "",
    `DURAÇÃO ${(summary.durationMs / 1000).toFixed(2)} s`,
  ];
  const width = Math.max(...lines.map((line) => line.length));
  const border = `+${"-".repeat(width + 2)}+`;
  const colorize = (text, code) =>
    useColor ? `\u001b[${code}m${text}\u001b[0m` : text;
  const body = lines.map((line, index) => {
    const content = line.padEnd(width);
    const framed = `| ${content} |`;
    if (index === 0) return colorize(framed, "1;96");
    if (index === 2) return colorize(framed, summary.failed === 0 ? "92" : "91");
    if (index === 1 || index === 4) return colorize(framed, "95");
    return framed;
  });

  console.log();
  console.log(border);
  console.log(body.join("\n"));
  console.log(border);
}

const result = spawnSync(
  process.execPath,
  ["--test", "--test-reporter=spec"],
  {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    stdio: ["inherit", "pipe", "pipe"],
  },
);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.error) {
  console.error(`Falha ao iniciar a suíte: ${result.error.message}`);
  process.exitCode = 1;
} else if (result.signal) {
  console.error(`Suíte interrompida pelo sinal ${result.signal}.`);
  process.exitCode = 1;
} else {
  const succeeded = result.status === 0;
  const summary = summarizeResults(result.stdout ?? "");
  if (summary) {
    renderResults(summary);
  } else {
    console.error("Não foi possível interpretar o resumo do test runner.");
  }
  const status = succeeded
    ? "TODAS AS VERIFICAÇÕES PASSARAM"
    : `VERIFICAÇÕES FALHARAM • CÓDIGO ${result.status ?? "DESCONHECIDO"}`;
  console.log();
  console.log(paint(`╭─ ZION TEST STATUS ─ ${status} ─╮`, succeeded ? "92" : "91"));
  process.exitCode = summary ? (result.status ?? 1) : 1;
}
