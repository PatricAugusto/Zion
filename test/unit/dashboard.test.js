import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  analyzeObservability,
  analyzeScenario,
  renderAlertAnalysis,
  renderAnalysis,
  renderAlerts,
  renderDashboard,
  renderLearning,
  renderObservability,
  renderObjects,
  renderProtocols,
  renderSessionLog,
  renderSectorAnalysis,
} from "../../src/dashboard.js";

describe("Zion unit tests", () => {

test("dashboard identifies the environment as isolated and simulated", () => {
  const output = renderDashboard();

  assert.match(output, /workspace local/);
  assert.match(output, /simulação didática/);
  assert.match(output, /SEM TELEMETRIA.*SEM AÇÕES EXTERNAS/);
});

test("dashboard shows all sectors and derives counts from scenario data", () => {
  const output = renderDashboard();

  assert.match(output, /ÓRBITA BAIXA/);
  assert.match(output, /ÓRBITA MÉDIA/);
  assert.match(output, /REGIÃO LUNAR/);
  assert.match(output, /09\s+objetos\s+03\s+alertas\s+03\s+setores/);
  assert.match(output, /INTEGRIDADE\s+▰+▱*\s+10\/10\s+SÉRIES\s+06 ciclos/);
  assert.match(output, /B2\s+\/\s+ÓRBITA MÉDIA\s+·\s+2 alertas simulados para revisão/);
  assert.match(output, /SETOR\s+ESTADO\s+OBJ\s+EVT/);
  assert.match(output, /01\. A1 ÓRBITA BAIXA/);
});

test("observability provides deterministic samples and descriptive statistics", () => {
  const analysis = analyzeObservability();

  assert.equal(analysis.source, "SÉRIE DIDÁTICA FIXA");
  assert.equal(analysis.cycleCount, 6);
  assert.deepEqual(analysis.cycles, ["C-05", "C-04", "C-03", "C-02", "C-01", "C-00"]);
  assert.deepEqual(
    analysis.series.map(({ key, minimum, maximum, mean, change, trend }) => ({
      key,
      minimum,
      maximum,
      mean,
      change,
      trend,
    })),
    [
      { key: "records", minimum: 12, maximum: 21, mean: 16.166666666666668, change: 9, trend: "AUMENTO" },
      { key: "events", minimum: 0, maximum: 2, mean: 1, change: 1, trend: "AUMENTO" },
      { key: "completeness", minimum: 91, maximum: 97, mean: 94.16666666666667, change: 5, trend: "AUMENTO" },
    ],
  );
});

test("observability screen aligns cycle values and separates descriptive statistics", () => {
  const output = renderObservability();

  assert.match(output, /PAINEL DE OBSERVABILIDADE/);
  assert.match(output, /SÉRIE DIDÁTICA FIXA/);
  assert.match(output, /VALORES POR CICLO/);
  assert.match(output, /CICLO\s+REGISTROS\s+EVENTOS\s+PREENCHIMENTO/);
  assert.match(output, /C-05\s+12\s+1\s+92/);
  assert.match(output, /C-00\s+21\s+2\s+97/);
  assert.match(output, /RESUMO ESTATÍSTICO/);
  assert.match(output, /SÉRIE\s+UNIDADE\s+MÍN\s+MÉDIA\s+MÁX\s+Δ/);
  assert.match(output, /REGISTROS\s+registros\/ciclo\s+12\s+16\.2\s+21\s+\+9/);
  assert.match(output, /EVENTOS\s+eventos\/ciclo\s+0\s+1\s+2\s+\+1/);
  assert.match(output, /PREENCHIMENTO\s+%\s+91\s+94\.2\s+97\s+\+5/);
  assert.match(output, /Cada linha representa um ciclo; as colunas mantêm a mesma unidade/);
  assert.match(output, /Δ compara o primeiro e o último ciclo da amostra/);
  assert.match(output, /Amostra fixa e didática; não é telemetria nem métrica física/);
});

test("guided reading explains descriptive statistics without predictive claims", () => {
  const output = renderLearning();

  assert.match(output, /LEITURA GUIADA DAS SÉRIES/);
  assert.match(output, /MÍN \/ MÉD \/ MÁX/);
  assert.match(output, /Tendência compara apenas o primeiro e o último ciclo/);
  assert.match(output, /Correlação, causalidade e previsão não são calculadas/);
  assert.match(output, /não são orientação operacional/);
});

test("session log view shows recent events and retention without raw input", () => {
  const output = renderSessionLog({
    entries: [
      {
        sequence: 1,
        timestamp: "2026-10-12T12:00:00.000Z",
        level: "INFO",
        message: "Sessão Zion iniciada.",
      },
      {
        sequence: 2,
        timestamp: "2026-10-12T12:01:00.000Z",
        level: "AVISO",
        message: "Entrada de menu rejeitada.",
      },
    ],
    discardedCount: 0,
    capacity: 50,
  });

  assert.match(output, /REGISTRO DE SESSÃO LOCAL/);
  assert.match(output, /2026-10-12T12:00:00.000Z/);
  assert.match(output, /Sessão Zion iniciada/);
  assert.match(output, /ENTRADAS RETIDAS: 2\/50/);
  assert.match(output, /Texto digitado não é armazenado/);
});

test("object view presents expanded fictional records and comparative attributes", () => {
  const output = renderObjects();

  assert.match(output, /OBJETOS SIMULADOS\s+·\s+09 REGISTROS/);
  assert.match(output, /7 estáveis\s+·\s+2 em observação\s+·\s+preenchimento médio 92\.3%/);
  for (const id of [
    "SIM-01", "SIM-02", "SIM-03", "SIM-04", "SIM-05",
    "SIM-06", "SIM-07", "SIM-08", "SIM-09",
  ]) {
    assert.match(output, new RegExp(id));
  }
  assert.match(output, /SIM-01\s+PLATAFORMA A/);
  assert.match(output, /A1\s+·\s+ÓRBITA BAIXA\s+\|\s+perfil PLATAFORMA/);
  assert.match(output, /estado ESTÁVEL\s+\|\s+preenchimento 98%\s+\|\s+12 ciclos/);
  assert.match(output, /Perfis, preenchimento e ciclos são valores fictícios/);
  assert.match(output, /Não representam telemetria, medições físicas ou atividade orbital real/);
});

test("alert view labels alerts as simulated", () => {
  const output = renderAlerts();

  assert.match(output, /ALERTAS DO CENÁRIO SIMULADO/);
  assert.match(output, /NÍVEIS VISUAIS FICTÍCIOS — NÃO REPRESENTAM RISCO REAL/);
  assert.match(output, /EVT-01.*NORMAL/);
  assert.match(output, /EVT-02.*ATENÇÃO/);
  assert.match(output, /EVT-03.*CRÍTICO/);
  assert.match(output, /crítico = revisar já · atenção = observar · normal = cenário estável/);
  assert.match(output, /não representam eventos ou condições espaciais reais/);
  assert.match(renderAlerts(true), /\u001b\[91m.*EVT-03.*CRÍTICO/);
  assert.match(renderAlerts(true), /\u001b\[93m.*EVT-02.*ATENÇÃO/);
  assert.match(renderAlerts(true), /\u001b\[92m.*EVT-01.*NORMAL/);
});

test("alert analysis summarizes synthetic labels without implying real severity", () => {
  const output = renderAlertAnalysis();

  assert.match(output, /RESUMO DE ALERTAS SIMULADOS/);
  assert.match(output, /CRÍTICO\s+1 registro\(s\)/);
  assert.match(output, /ATENÇÃO\s+1 registro\(s\)/);
  assert.match(output, /NORMAL\s+1 registro\(s\)/);
  assert.match(output, /TOTAL DE REGISTROS: 3/);
  assert.match(output, /exemplos visuais fictícios, sem ameaça real/);
});

test("integrity analysis validates local data structure, not space conditions", () => {
  const analysis = analyzeScenario();
  const output = renderAnalysis();

  assert.equal(analysis.passed, analysis.total);
  assert.equal(analysis.passed, 10);
  assert.match(output, /INTEGRIDADE DOS DADOS DO CENÁRIO/);
  assert.match(output, /VERIFICAÇÕES APROVADAS: 10\/10/);
  assert.match(output, /VERIFICAÇÃO\s+RESULTADO/);
  assert.match(output, /Objetos vinculados a setores existentes\s+OK/);
  assert.match(output, /Objetos vinculados a setores existentes/);
  assert.match(output, /Não é uma avaliação de risco ou condição espacial real/);
});

test("sector comparison derives object and alert counts by sector", () => {
  const output = renderSectorAnalysis();

  assert.match(output, /ANÁLISE COMPARATIVA DE SETORES/);
  assert.match(output, /A1 ÓRBITA BAIXA/);
  assert.match(output, /B2 ÓRBITA MÉDIA/);
  assert.match(output, /C3 REGIÃO LUNAR/);
  assert.match(output, /SETOR\s+STATUS\s+OBJETOS\s+ALERTAS/);
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
    .replace(/\u001b\[(?:91|96|1;96|95|92|93|36|2|0)m/g, "")
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
  assert.match(coloredOutput, /\u001b\[0m\r?\n\u001b\[1;96m│\s+Z I O N\s+\/\s+CENTRO DE CENÁRIO/);
  assert.equal(normalizedColorOutput, plainOutput);

  const plainAlerts = renderAlerts();
  const coloredAlerts = renderAlerts(true);
  assert.doesNotMatch(plainAlerts, /\u001b/);
  assert.match(coloredAlerts, /\u001b\[91m.*CRÍTICO/);
  assert.match(coloredAlerts, /\u001b\[93m.*ATENÇÃO/);
  assert.match(coloredAlerts, /\u001b\[92m.*NORMAL/);
});

test("dashboard keeps its title and subtitle centered in the panel", () => {
  const output = renderDashboard();
  const panelLines = output
    .split("\n")
    .slice(1, -1)
    .map((line) => line.slice(2, -2));

  for (const text of [
    "Z I O N   /   CENTRO DE CENÁRIO",
    "workspace local · simulação didática · somente leitura",
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

    assert.equal(Math.max(...widths), Math.max(60, Math.min(96, columns)));
    assert.match(output, /simulação didática/);
    assert.match(output, /Z I O N/);
  }
});

test("dashboard safely falls back for invalid terminal dimensions", () => {
  const defaultOutput = renderDashboard(false, 80);

  for (const columns of [Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(renderDashboard(false, columns), defaultOutput);
  }
});

});
