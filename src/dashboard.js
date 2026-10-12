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

const STATUS_LABELS = new Set(["NOMINAL", "OBSERVAÇÃO"]);
const OBJECT_STATUSES = new Set(["ESTÁVEL", "OBSERVAÇÃO"]);
const ALERT_LEVELS = new Set(["INFO", "AVISO"]);

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
    if (options.accentLines?.includes(index)) return colorize(padded, "95");
    if (options.statusLines?.includes(index)) return colorize(padded, "92");
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
  const width = Math.max(52, Math.min(100, safeColumns - 4));
  const mapLines =
    width < 68
      ? [
          "╭──── MAPA DE SETORES / SEM ESCALA ────╮",
          "                    · ✦ ·",
          "             [A1] -- (ZION) -- [C3]",
          "                    · [B2] ·",
        ]
      : [
          "╭─────────────── MAPA DE SETORES / SEM ESCALA ───────────────╮",
          "                         ·  ✦  ·",
          "                    ·     \\ | /     ·",
          "         [A1] ════════ ◉ ZION ◉ ════════ [C3]",
          "                    ·     / | \\     ·",
          "                         · [B2] ·",
        ];
  const lines = [
    "✦  Z I O N   /   CENTRO DE CONSCIÊNCIA ESPACIAL  ✦",
    "NÚCLEO DEMONSTRATIVO  •  SISTEMA ISOLADO",
    "SEM TELEMETRIA  •  SEM CONEXÕES EXTERNAS",
    "",
    ...mapLines,
    "",
    ...snapshot.sectors.map((sector) => {
      const objectCount = snapshot.objects.filter(
        (object) => object.sectorId === sector.id,
      ).length;
      return `[${sector.id}] ${sector.name.padEnd(17)} ${sector.status.padEnd(12)} ${objectCount} OBJ`;
    }),
    "",
    ...(width < 72
      ? [
          `OBJETOS ${String(snapshot.objects.length).padStart(2, "0")}   |   ALERTAS ${String(snapshot.alerts.length).padStart(2, "0")}`,
          `SETORES ${String(snapshot.sectors.length).padStart(2, "0")}   |   INTEGRIDADE ${analysis.passed}/${analysis.total}`,
        ]
      : [
          `OBJETOS ${String(snapshot.objects.length).padStart(2, "0")}   |   ALERTAS ${String(snapshot.alerts.length).padStart(2, "0")}   |   SETORES ${String(snapshot.sectors.length).padStart(2, "0")}`,
        ]),
    `INTEGRIDADE LOCAL  [${"#".repeat(analysis.passed)}]  ${analysis.passed}/${analysis.total}`,
    "",
    "✧  DADOS FICTÍCIOS  •  APENAS LEITURA  ✧",
    "SEM AÇÕES EXTERNAS  •  ANÁLISES NÃO INDICAM RISCO REAL",
  ];

  const centerLines = lines.flatMap((line, index) =>
    line !== "" && !/^\[(?:A1|B2|C3)\]/.test(line) ? [index] : [],
  );
  const coreLine = lines.findIndex((line) => line.includes("ZION"));
  const safetyBadgeLine = lines.findIndex((line) => line.startsWith("✧"));
  return frame(lines, useColor, {
    width,
    centerLines,
    accentLines: [coreLine],
    statusLines: [safetyBadgeLine],
    secondaryLines: [1, 2, 5],
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
