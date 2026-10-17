import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { renderTestReport, summarizeTestResults } from "./test-report.js";

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
  const summary = summarizeTestResults(result.stdout ?? "");
  if (summary) {
    console.log();
    console.log(renderTestReport(summary, { useColor }));
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
