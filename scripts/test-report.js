import Table from "cli-table3";

export function summarizeTestResults(output) {
  const count = (name) => {
    const match = output.match(new RegExp(`^ℹ ${name} (\\d+)$`, "m"));
    return match ? Number(match[1]) : null;
  };
  const tests = count("tests");
  const passed = count("pass");
  const failed = count("fail");
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
    skipped: count("skipped") ?? 0,
    cancelled: count("cancelled") ?? 0,
    todo: count("todo") ?? 0,
    durationMs: Number(durationMatch[1]),
    suites,
  };
}

export function renderTestReport(summary, { useColor = false } = {}) {
  const passRatio = summary.tests === 0 ? 0 : summary.passed / summary.tests;
  const progressSlots = 24;
  const passedSlots = Math.min(
    progressSlots,
    Math.round(passRatio * progressSlots),
  );
  const failedSlots = Math.min(
    progressSlots - passedSlots,
    summary.tests === 0
      ? 0
      : Math.round((summary.failed / summary.tests) * progressSlots),
  );
  const progress = "█".repeat(passedSlots) +
    "■".repeat(failedSlots) +
    "·".repeat(progressSlots - passedSlots - failedSlots);
  const table = new Table({
    head: ["SUÍTE", "PASS", "FALHA", "IGN."],
    style: { head: [], border: [], compact: true },
    chars: {
      top: "",
      "top-mid": "",
      "top-left": "",
      "top-right": "",
      bottom: "",
      "bottom-mid": "",
      "bottom-left": "",
      "bottom-right": "",
      left: " ",
      "left-mid": "",
      mid: "",
      "mid-mid": "",
      right: "",
      "right-mid": "",
      middle: "  ",
    },
  });
  for (const suite of summary.suites) {
    table.push([
      suite.name,
      suite.passed,
      suite.failed,
      suite.skipped,
    ]);
  }

  const lines = [
    "VISÃO GERAL DOS TESTES",
    `TOTAL ${summary.tests}  ·  PASSOU ${summary.passed}  ·  FALHOU ${summary.failed}`,
    `IGNORADOS ${summary.skipped}  ·  CANCELADOS ${summary.cancelled}  ·  TODO ${summary.todo}`,
    `APROVAÇÃO  ${progress}  ${Math.round(passRatio * 100)}%`,
    "",
    "RESULTADOS POR SUÍTE",
    ...(summary.suites.length === 0
      ? ["Nenhuma suíte reportada."]
      : table.toString().split("\n")),
    "",
    `DURAÇÃO  ${(summary.durationMs / 1000).toFixed(2)} s`,
  ];
  const width = Math.max(...lines.map((line) => line.length));
  const colorize = (text, code) =>
    useColor ? `\u001b[${code}m${text}\u001b[0m` : text;
  const border = `${useColor ? "╭" : "+"}${(useColor ? "─" : "-").repeat(width + 2)}${useColor ? "╮" : "+"}`;
  const bottomBorder = `${useColor ? "╰" : "+"}${(useColor ? "─" : "-").repeat(width + 2)}${useColor ? "╯" : "+"}`;
  const body = lines.map((line, index) => {
    const framed = `${useColor ? "│" : "|"} ${line.padEnd(width)} ${useColor ? "│" : "|"}`;
    if (index === 0) return colorize(framed, "1;96");
    if (index === 1) return colorize(framed, summary.failed === 0 ? "92" : "91");
    if (index === 3) return colorize(framed, summary.failed === 0 ? "92" : "91");
    return framed;
  });

  return [colorize(border, "96"), ...body, colorize(bottomBorder, "96")].join("\n");
}
