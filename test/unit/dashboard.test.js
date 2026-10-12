import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeScenario,
  renderAlertAnalysis,
  renderAnalysis,
  renderAlerts,
  renderDashboard,
  renderObjects,
  renderProtocols,
  renderSectorAnalysis,
} from "../../src/dashboard.js";

test("dashboard identifies the environment as isolated and simulated", () => {
  const output = renderDashboard();

  assert.match(output, /SISTEMA ISOLADO/);
  assert.match(output, /SEM TELEMETRIA/);
  assert.match(output, /DADOS FICTÍCIOS/);
  assert.match(
    output,
    /SEM AÇÕES EXTERNAS/,
  );
});

test("dashboard shows all sectors and derives counts from scenario data", () => {
  const output = renderDashboard();

  assert.match(output, /ÓRBITA BAIXA/);
  assert.match(output, /ÓRBITA MÉDIA/);
  assert.match(output, /REGIÃO LUNAR/);
  assert.match(output, /OBJETOS 03/);
  assert.match(output, /ALERTAS 02/);
  assert.match(output, /INTEGRIDADE LOCAL.*8\/8/);
});

test("object view shows only the fixed simulated object set", () => {
  const output = renderObjects();

  assert.match(output, /OBJETOS DO CENÁRIO SIMULADO/);
  assert.match(output, /SIM-01\s+PLATAFORMA A\s+ÓRBITA BAIXA/);
  assert.match(output, /SIM-02\s+PLATAFORMA B\s+ÓRBITA MÉDIA/);
  assert.match(output, /SIM-03\s+SONDA C\s+REGIÃO LUNAR/);
  assert.match(output, /são demonstrativos/);
});

test("alert view labels alerts as simulated", () => {
  const output = renderAlerts();

  assert.match(output, /ALERTAS DO CENÁRIO SIMULADO/);
  assert.match(output, /EVT-01.*\[INFO\]/);
  assert.match(output, /EVT-02.*\[AVISO\]/);
  assert.match(output, /não representam eventos espaciais reais/);
});

test("alert analysis summarizes synthetic labels without implying real severity", () => {
  const output = renderAlertAnalysis();

  assert.match(output, /RESUMO DE ALERTAS SIMULADOS/);
  assert.match(output, /\[INFO\] 1 registro\(s\)/);
  assert.match(output, /\[AVISO\] 1 registro\(s\)/);
  assert.match(output, /não indicam urgência ou ameaça real/);
});

test("integrity analysis validates local data structure, not space conditions", () => {
  const analysis = analyzeScenario();
  const output = renderAnalysis();

  assert.equal(analysis.passed, analysis.total);
  assert.equal(analysis.passed, 8);
  assert.match(output, /INTEGRIDADE DOS DADOS DO CENÁRIO/);
  assert.match(output, /VERIFICAÇÕES APROVADAS: 8\/8/);
  assert.match(output, /Objetos vinculados a setores existentes/);
  assert.match(output, /Não é uma avaliação de risco ou condição espacial real/);
});

test("sector comparison derives object and alert counts by sector", () => {
  const output = renderSectorAnalysis();

  assert.match(output, /ANÁLISE COMPARATIVA DE SETORES/);
  assert.match(output, /A1 ÓRBITA BAIXA/);
  assert.match(output, /B2 ÓRBITA MÉDIA/);
  assert.match(output, /C3 REGIÃO LUNAR/);
  assert.match(output, /CONTAGENS DO CENÁRIO FICTÍCIO/);
  assert.match(output, /não indicam risco, distância, trajetória ou segurança real/);
});

test("protocol view states the safety boundaries", () => {
  const output = renderProtocols();

  assert.match(output, /PRINCÍPIOS DE SEGURANÇA DO ZION/);
  assert.match(output, /não se conecta a fontes ou sistemas externos/);
  assert.match(output, /não envia comandos ou ações/);
  assert.match(output, /supervisão humana/);
});

test("color is opt-in and adds only fixed ANSI formatting", () => {
  const plainOutput = renderDashboard();
  const coloredOutput = renderDashboard(true);
  const normalizedColorOutput = coloredOutput
    .replace(/\u001b\[(?:96|1;96|95|92|2|0)m/g, "")
    .split("\n")
    .map((line) => {
      if (/^╭─+╮$/.test(line)) return line.replace(/^╭/, "+").replace(/╮$/, "+").replace(/─/g, "-");
      if (/^╰─+╯$/.test(line)) return line.replace(/^╰/, "+").replace(/╯$/, "+").replace(/─/g, "-");
      if (/^│.*│$/.test(line)) return line.replace(/^│/, "|").replace(/│$/, "|");
      return line;
    })
    .join("\n");

  assert.doesNotMatch(plainOutput, /\u001b/);
  assert.match(coloredOutput, /^\u001b\[96m╭/);
  assert.match(coloredOutput, /\u001b\[0m\r?\n\u001b\[1;96m│\s+✦  Z I O N/);
  assert.equal(normalizedColorOutput, plainOutput);
});

test("dashboard headings and safety notices are centered in the panel", () => {
  const output = renderDashboard();
  const panelLines = output
    .split("\n")
    .slice(1, -1)
    .map((line) => line.slice(2, -2));

  for (const text of [
    "✦  Z I O N   /   CENTRO DE CONSCIÊNCIA ESPACIAL  ✦",
    "NÚCLEO DEMONSTRATIVO  •  SISTEMA ISOLADO",
    "MAPA DE SETORES / SEM ESCALA",
    "✧  DADOS FICTÍCIOS  •  APENAS LEITURA  ✧",
  ]) {
    const line = panelLines.find((candidate) => candidate.includes(text));
    assert.ok(line, `expected panel line containing: ${text}`);
    const content = line;
    const leadingSpaces = content.length - content.trimStart().length;
    const trailingSpaces = content.length - content.trimEnd().length;

    assert.ok(Math.abs(leadingSpaces - trailingSpaces) <= 1, text);
  }
});

test("dashboard adapts its panel width to terminal size", () => {
  for (const columns of [60, 80, 120]) {
    const output = renderDashboard(false, columns);
    const widths = output.split("\n").map((line) => line.length);

    assert.equal(Math.max(...widths), Math.max(56, Math.min(104, columns)));
    assert.match(output, /DADOS FICTÍCIOS/);
    assert.match(output, /Z I O N/);
  }
});

test("dashboard safely falls back for invalid terminal dimensions", () => {
  const defaultOutput = renderDashboard(false, 80);

  for (const columns of [Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(renderDashboard(false, columns), defaultOutput);
  }
});
