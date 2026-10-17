const snapshot = {
  sectors: [
    { id: "A1", name: "ÓRBITA BAIXA", status: "NOMINAL" },
    { id: "B2", name: "ÓRBITA MÉDIA", status: "OBSERVAÇÃO" },
    { id: "C3", name: "REGIÃO LUNAR", status: "NOMINAL" },
  ],
  objects: [
    { id: "SIM-01", name: "PLATAFORMA A", sectorId: "A1", status: "ESTÁVEL" },
    { id: "SIM-02", name: "PLATAFORMA B", sectorId: "B2", status: "OBSERVAÇÃO" },
    { id: "SIM-03", name: "SONDA C", sectorId: "C3", status: "ESTÁVEL" },
  ],
  alerts: [
    {
      id: "EVT-01",
      sectorId: null,
      level: "INFO",
      message: "Cenário demonstrativo carregado com dados fictícios.",
    },
    {
      id: "EVT-02",
      sectorId: "B2",
      level: "AVISO",
      message: "Setor B2 marcado para observação no cenário simulado.",
    },
  ],
};

const observability = {
  source: "SÉRIE DIDÁTICA FIXA",
  cycles: [
    { id: "C-05", records: 12, events: 1, completeness: 92 },
    { id: "C-04", records: 15, events: 0, completeness: 94 },
    { id: "C-03", records: 14, events: 2, completeness: 91 },
    { id: "C-02", records: 18, events: 1, completeness: 96 },
    { id: "C-01", records: 17, events: 0, completeness: 95 },
    { id: "C-00", records: 21, events: 2, completeness: 97 },
  ],
};

const STATUS_LABELS = new Set(["NOMINAL", "OBSERVAÇÃO"]);
const OBJECT_STATUSES = new Set(["ESTÁVEL", "OBSERVAÇÃO"]);
const ALERT_LEVELS = new Set(["INFO", "AVISO"]);

function summarizeSeries(values) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const change = values.at(-1) - values[0];

  return {
    minimum,
    maximum,
    mean,
    change,
    trend: change > 0 ? "AUMENTO" : change < 0 ? "REDUÇÃO" : "ESTÁVEL",
  };
}

function sparkline(values) {
  const glyphs = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
  const minimum = Math.min(...values);
  const range = Math.max(...values) - minimum;

  return values
    .map((value) => {
      const level = range === 0
        ? 0
        : Math.round(((value - minimum) / range) * (glyphs.length - 1));
      return glyphs[level];
    })
    .join("");
}

function frame(lines, useColor = false, options = {}) {
  const width = Math.max(
    ...lines.map((line) => line.length),
    options.width ?? 0,
  );
  const horizontal = useColor ? "─" : "-";
  const leftTop = useColor ? "╭" : "+";
  const rightTop = useColor ? "╮" : "+";
  const leftBottom = useColor ? "╰" : "+";
  const rightBottom = useColor ? "╯" : "+";
  const border = `${horizontal.repeat(width + 2)}`;
  const colorize = (value, code) =>
    useColor ? `\u001b[${code}m${value}\u001b[0m` : value;
  const body = lines.map((line, index) => {
    const content = options.centerLines?.includes(index)
      ? line.padStart(Math.floor((width + line.length) / 2)).padEnd(width)
      : line.padEnd(width);
    const padded = `│ ${content} │`;
    if (!useColor) return `| ${content} |`;
    if (index === 0) return colorize(padded, "1;96");
    if (options.warningLines?.includes(index)) return colorize(padded, "93");
    if (options.accentLines?.includes(index)) return colorize(padded, "95");
    if (options.statusLines?.includes(index)) return colorize(padded, "92");
    if (options.headingLines?.includes(index)) return colorize(padded, "36");
    if (options.secondaryLines?.includes(index)) return colorize(padded, "2");
    return padded;
  });

  return [
    colorize(`${leftTop}${border}${rightTop}`, "96"),
    ...body,
    colorize(`${leftBottom}${border}${rightBottom}`, "96"),
  ].join("\n");
}

export function analyzeScenario() {
  const sectorIds = new Set(snapshot.sectors.map(({ id }) => id));
  const objectIds = snapshot.objects.map(({ id }) => id);
  const alertIds = snapshot.alerts.map(({ id }) => id);
  const checks = [
    {
      name: "Identificadores de setores únicos",
      passed: sectorIds.size === snapshot.sectors.length,
    },
    {
      name: "Identificadores de objetos únicos",
      passed: new Set(objectIds).size === objectIds.length,
    },
    {
      name: "Objetos vinculados a setores existentes",
      passed: snapshot.objects.every(({ sectorId }) => sectorIds.has(sectorId)),
    },
    {
      name: "Estados de setor reconhecidos",
      passed: snapshot.sectors.every(({ status }) => STATUS_LABELS.has(status)),
    },
    {
      name: "Estados de objeto reconhecidos",
      passed: snapshot.objects.every(({ status }) => OBJECT_STATUSES.has(status)),
    },
    {
      name: "Identificadores de alertas únicos",
      passed: new Set(alertIds).size === alertIds.length,
    },
    {
      name: "Alertas vinculados a setores existentes",
      passed: snapshot.alerts.every(
        ({ sectorId }) => sectorId === null || sectorIds.has(sectorId),
      ),
    },
    {
      name: "Níveis de alerta reconhecidos",
      passed: snapshot.alerts.every(({ level }) => ALERT_LEVELS.has(level)),
    },
  ];

  return {
    checks,
    passed: checks.filter(({ passed }) => passed).length,
    total: checks.length,
  };
}

export function analyzeObservability() {
  const series = [
    {
      key: "records",
      label: "Registros do cenário por ciclo",
      unit: "registros/ciclo",
      values: observability.cycles.map(({ records }) => records),
    },
    {
      key: "events",
      label: "Eventos didáticos por ciclo",
      unit: "eventos/ciclo",
      values: observability.cycles.map(({ events }) => events),
    },
    {
      key: "completeness",
      label: "Campos preenchidos no conjunto",
      unit: "%",
      values: observability.cycles.map(({ completeness }) => completeness),
    },
  ];

  return {
    source: observability.source,
    cycleCount: observability.cycles.length,
    cycles: observability.cycles.map(({ id }) => id),
    series: series.map((item) => ({
      ...item,
      ...summarizeSeries(item.values),
    })),
  };
}

export function renderObservability(useColor = false) {
  const analysis = analyzeObservability();
  const seriesNames = new Map([
    ["records", "REGISTROS"],
    ["events", "EVENTOS"],
    ["completeness", "PREENCHIMENTO"],
  ]);
  const lines = [
    "PAINEL DE OBSERVABILIDADE",
    `${analysis.source}  ·  ${analysis.cycleCount} CICLOS`,
    "",
    `CICLOS  ${analysis.cycles.join("   ")}`,
    "",
    ...analysis.series.flatMap((series, index) => {
      const mean = Number.isInteger(series.mean)
        ? String(series.mean)
        : series.mean.toFixed(1);
      const change = series.change > 0 ? `+${series.change}` : String(series.change);
      return [
        `${String(index + 1).padStart(2, "0")}  ${seriesNames.get(series.key)}  ·  ${series.unit}`,
        `    ${sparkline(series.values)}`,
        `    ${series.values.join("    ")}`,
        `    mín ${series.minimum}   ·   média ${mean}   ·   máx ${series.maximum}   ·   Δ ${change}`,
        "",
      ];
    }),
    "Barras relativas à própria série; compare valores, não comprimentos.",
    "Amostra fixa e didática; não é telemetria nem métrica física.",
  ];

  return frame(lines, useColor, {
    accentLines: [1],
    headingLines: [3, 5, 10, 15],
    secondaryLines: [lines.length - 2, lines.length - 1],
  });
}

export function renderLearning(useColor = false) {
  const analysis = analyzeObservability();
  const lines = [
    "LEITURA GUIADA DAS SÉRIES",
    "COMO INTERPRETAR OS DADOS DIDÁTICOS",
    "",
    ...analysis.series.map((series) => {
      const change = series.change > 0 ? `+${series.change}` : String(series.change);
      return `${series.label}: ${series.trend} (${change} ${series.unit})`;
    }),
    "",
    "MÍN / MÉD / MÁX: menor, média aritmética e maior valor da série.",
    "Tendência compara apenas o primeiro e o último ciclo da amostra.",
    "Correlação, causalidade e previsão não são calculadas.",
    "Ciclos C-05 a C-00 são rótulos relativos, sem horário de calendário.",
    "Use os dados para praticar leitura; não são orientação operacional.",
  ];

  return frame(lines, useColor, {
    centerLines: [0, 1, 8, 9, 10, 11, 12],
    accentLines: [1],
  });
}

export function renderSessionLog(
  { entries, discardedCount, capacity },
  useColor = false,
) {
  const visibleEntries = entries.slice(-12);
  const lines = [
    "REGISTRO DE SESSÃO LOCAL",
    "EVENTOS DO PROCESSO ATUAL  •  VOLÁTIL  •  NÃO É AUDITORIA PERSISTENTE",
    "",
    "SEQ  HORÁRIO UTC              NÍVEL   EVENTO",
    ...(visibleEntries.length === 0
      ? ["Nenhum evento registrado nesta sessão."]
      : visibleEntries.map(
          ({ sequence, timestamp, level, message }) =>
            `${String(sequence).padStart(3, "0")}  ${timestamp}  ${level.padEnd(5)}  ${message}`,
        )),
    "",
    `ENTRADAS RETIDAS: ${entries.length}/${capacity}  •  DESCARTADAS POR LIMITE: ${discardedCount}`,
    "Texto digitado não é armazenado; eventos usam rótulos predefinidos.",
  ];

  return frame(lines, useColor, {
    centerLines: [0, 1, 10, 11],
    accentLines: [1],
  });
}

export function renderAdminUsers(users, useColor = false) {
  const safeText = (value) =>
    String(value).replace(/[\u0000-\u001f\u007f-\u009f\u001b\u202a-\u202e\u2066-\u2069]/g, "?");
  const lines = [
    "CONTAS LOCAIS",
    "IDENTIDADE E ESTADO DE ACESSO",
    "",
    "USUÁRIO                         PAPEL       ESTADO",
    ...(users.length === 0
      ? ["Nenhuma conta cadastrada."]
      : users.map(({ username, role, isActive, lockedUntil }) => {
          const state = !isActive
            ? "INATIVA"
            : lockedUntil && lockedUntil > new Date()
              ? "BLOQUEADA"
              : "ATIVA";
          return `${safeText(username).padEnd(32)}${safeText(role).padEnd(12)}${state}`;
        })),
    "",
    "Senhas não são exibidas; bloqueios são temporários.",
  ];
  return frame(lines, useColor, {
    centerLines: [0, 1, lines.length - 1],
    accentLines: [1],
  });
}

export function renderAuditEntries(entries, useColor = false) {
  const safeText = (value) =>
    String(value).replace(/[\u0000-\u001f\u007f-\u009f\u001b\u202a-\u202e\u2066-\u2069]/g, "?");
  const lines = [
    "AUDITORIA LOCAL",
    "EVENTOS RECENTES · SOMENTE LEITURA",
    "",
    "DATA UTC                   USUÁRIO       EVENTO",
    ...(entries.length === 0
      ? ["Nenhum evento registrado."]
      : entries.map(({ createdAt, actor, action }) =>
          `${new Date(createdAt).toISOString()}  ${safeText(actor).padEnd(13)} ${safeText(action)}`,
        )),
    "",
    "Retenção local sem conteúdo de senha ou texto livre.",
  ];
  return frame(lines, useColor, {
    centerLines: [0, 1, lines.length - 1],
    accentLines: [1],
  });
}

export function renderSectorAnalysis(useColor = false) {
  const lines = [
    "ANÁLISE COMPARATIVA DE SETORES",
    "CONTAGENS DO CENÁRIO FICTÍCIO — NÃO SÃO MÉTRICAS ORBITAIS",
    "",
    "SETOR                STATUS       OBJETOS  ALERTAS",
    ...snapshot.sectors.map((sector) => {
      const objectCount = snapshot.objects.filter(
        (object) => object.sectorId === sector.id,
      ).length;
      const alertCount = snapshot.alerts.filter(
        (alert) => alert.sectorId === sector.id,
      ).length;
      const name = `${sector.id} ${sector.name}`.padEnd(21);
      const status = sector.status.padEnd(12);
      const objects = String(objectCount).padStart(7);
      return `${name}${status}${objects}${String(alertCount).padStart(9)}`;
    }),
    "",
    "BARRA = quantidade de objetos cadastrados no cenário:",
    ...snapshot.sectors.map((sector) => {
      const count = snapshot.objects.filter(
        (object) => object.sectorId === sector.id,
      ).length;
      return `${sector.id} ${"#".repeat(count).padEnd(snapshot.objects.length, "-")} ${count}`;
    }),
    "",
    "Contagens não indicam risco, distância, trajetória ou segurança real.",
  ];

  return frame(lines, useColor, {
    centerLines: [0, 1, 3, 8, 14],
    accentLines: [1],
  });
}

export function renderAnalysis(useColor = false) {
  const analysis = analyzeScenario();
  const lines = [
    "INTEGRIDADE DOS DADOS DO CENÁRIO",
    "VERIFICAÇÕES ESTRUTURAIS LOCAIS — CENÁRIO FICTÍCIO",
    "",
    `VERIFICAÇÕES APROVADAS: ${analysis.passed}/${analysis.total}`,
    "",
    ...analysis.checks.map(
      ({ name, passed }) => `[${passed ? "OK" : "FALHA"}] ${name}`,
    ),
    "",
    "Resultado avalia apenas consistência dos dados de demonstração.",
    "Não é uma avaliação de risco ou condição espacial real.",
  ];

  return frame(lines, useColor, {
    centerLines: [0, 1, 3, 14, 15],
    accentLines: [1],
    statusLines: analysis.checks.map((check, index) => index + 5),
  });
}

export function renderDashboard(useColor = false, terminalColumns = 80) {
  const analysis = analyzeScenario();
  const safeColumns = Number.isFinite(terminalColumns)
    ? Math.floor(terminalColumns)
    : 80;
  const width = Math.max(56, Math.min(92, safeColumns - 4));
  const sectorRows = snapshot.sectors.map((sector, index) => {
    const objectCount = snapshot.objects.filter(
      (object) => object.sectorId === sector.id,
    ).length;
    const alertCount = snapshot.alerts.filter(
      (alert) => alert.sectorId === sector.id,
    ).length;
    const name = `${String(index + 1).padStart(2, "0")}. ${sector.id} ${sector.name}`;
    const status = sector.status === "OBSERVAÇÃO" ? "● ATENÇÃO" : "● NOMINAL";
    const objectBar = "▰".repeat(objectCount) + "▱".repeat(3 - objectCount);
    return `${name.padEnd(26)}${status.padEnd(13)} ${objectBar}  ${String(alertCount).padStart(2, "0")} ev.`;
  });
  const observedSector = snapshot.sectors.find(({ status }) => status === "OBSERVAÇÃO");
  const observedAlertCount = snapshot.alerts.filter(
    ({ sectorId }) => sectorId === observedSector?.id,
  ).length;
  const lines = [
    "Z I O N   /   CENTRO DE CENÁRIO",
    "workspace local · simulação didática · somente leitura",
    "",
    "VISÃO GERAL",
    `  ${String(snapshot.objects.length).padStart(2, "0")}  objetos      ${String(snapshot.alerts.length).padStart(2, "0")}  alertas      ${String(snapshot.sectors.length).padStart(2, "0")}  setores`,
    `  INTEGRIDADE  ${"▰".repeat(analysis.passed)}${"▱".repeat(analysis.total - analysis.passed)}  ${analysis.passed}/${analysis.total}      SÉRIES  ${String(observability.cycles.length).padStart(2, "0")} ciclos`,
    "",
    "SETORES MONITORADOS",
    "SETOR                      ESTADO       OBJ  EVT",
    ...sectorRows,
    "",
    "LEITURA EM DESTAQUE",
    observedSector
      ? width < 68
        ? `  ${observedSector.id} · ${observedAlertCount} alerta(s) simulado(s)`
        : `  ${observedSector.id}  /  ${observedSector.name}   ·   ${observedAlertCount} alerta simulado para revisão`
      : "  Nenhum setor marcado para observação",
    "",
    width < 68
      ? "DEMO LOCAL · SEM TELEMETRIA · SEM AÇÕES EXTERNAS"
      : "DADOS FICTÍCIOS   ·   SEM TELEMETRIA   ·   SEM AÇÕES EXTERNAS",
  ];

  const sectionLines = lines.flatMap((line, index) =>
    ["VISÃO GERAL", "SETORES MONITORADOS", "LEITURA EM DESTAQUE"].includes(line)
      ? [index]
      : [],
  );
  const warningLines = observedSector
    ? [lines.findIndex((line) => line.startsWith(`  ${observedSector.id} `))]
    : [];

  return frame(lines, useColor, {
    width,
    centerLines: [0, 1],
    headingLines: sectionLines,
    statusLines: [4],
    warningLines,
    secondaryLines: [1, lines.length - 1],
  });
}

export function renderObjects(useColor = false) {
  const sectors = new Map(snapshot.sectors.map((sector) => [sector.id, sector]));
  const lines = [
    "OBJETOS DO CENÁRIO SIMULADO",
    "",
    "ID       OBJETO             SETOR              ESTADO",
    ...snapshot.objects.map((object) => {
      const sector = sectors.get(object.sectorId);
      return `${object.id.padEnd(9)}${object.name.padEnd(19)}${sector.name.padEnd(19)}${object.status}`;
    }),
    "",
    "Identificadores e estados acima são demonstrativos.",
  ];

  return frame(lines, useColor, {
    centerLines: [0, 7],
  });
}

export function renderAlerts(useColor = false) {
  const lines = [
    "ALERTAS DO CENÁRIO SIMULADO",
    "",
    ...snapshot.alerts.map(
      (alert) => `[${alert.id}] [${alert.level}] ${alert.message}`,
    ),
    "",
    "Alertas não representam eventos espaciais reais.",
  ];

  return frame(lines, useColor, {
    centerLines: [0, 5],
  });
}

export function renderAlertAnalysis(useColor = false) {
  const levels = [...new Set(snapshot.alerts.map(({ level }) => level))];
  const lines = [
    "RESUMO DE ALERTAS SIMULADOS",
    "CONTAGENS POR RÓTULO — SEM CLASSIFICAÇÃO DE RISCO REAL",
    "",
    ...levels.map((level) => {
      const count = snapshot.alerts.filter(
        (alert) => alert.level === level,
      ).length;
      return `[${level}] ${count} registro(s)`;
    }),
    "",
    `TOTAL DE REGISTROS: ${snapshot.alerts.length}`,
    "Os rótulos são didáticos e não indicam urgência ou ameaça real.",
  ];

  return frame(lines, useColor, {
    centerLines: [0, 1, 6, 7],
    accentLines: [1],
  });
}

export function renderProtocols(useColor = false) {
  const lines = [
    "PRINCÍPIOS DE SEGURANÇA DO ZION",
    "",
    "01. Dados e cenários devem permanecer identificados como fictícios.",
    "02. A interface não se conecta a fontes ou sistemas externos.",
    "03. As análises descrevem apenas consistência dos dados locais.",
    "04. O sistema é somente leitura; não envia comandos ou ações.",
    "05. Resultados não substituem validação ou supervisão humana.",
  ];

  return frame(lines, useColor, { centerLines: [0] });
}
