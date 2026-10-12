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

function frame(lines, useColor = false) {
  const width = Math.max(...lines.map((line) => line.length));
  const border = `+${"-".repeat(width + 2)}+`;
  const body = lines.map((line, index) => {
    const padded = `| ${line.padEnd(width)} |`;
    return useColor && index === 0 ? `\u001b[1;36m${padded}\u001b[0m` : padded;
  });

  return [
    useColor ? `\u001b[36m${border}\u001b[0m` : border,
    ...body,
    useColor ? `\u001b[36m${border}\u001b[0m` : border,
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

  return frame(lines, useColor);
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

  return frame(lines, useColor);
}

export function renderDashboard(useColor = false) {
  const analysis = analyzeScenario();
  const lines = [
    "ZION  /  CONSCIÊNCIA ESPACIAL",
    "AMBIENTE ISOLADO  |  SIMULAÇÃO  |  SEM CONEXÕES EXTERNAS",
    "",
    "+--------------------- CENÁRIO SEM ESCALA ---------------------+",
    ...snapshot.sectors.map((sector) => {
      const objectCount = snapshot.objects.filter(
        (object) => object.sectorId === sector.id,
      ).length;
      return `[${sector.id}] ${sector.name.padEnd(17)} ${sector.status.padEnd(12)} ${objectCount} OBJ`;
    }),
    "+---------------------------------------------------------------+",
    "",
    `OBJETOS ${String(snapshot.objects.length).padStart(2, "0")}  |  ALERTAS ${String(snapshot.alerts.length).padStart(2, "0")}  |  INTEGRIDADE ${analysis.passed}/${analysis.total}`,
    "",
    "DADOS FICTÍCIOS. NÃO REPRESENTAM TELEMETRIA OU SITUAÇÃO REAL.",
    "Somente leitura demonstrativa; nenhuma ação externa é executada.",
  ];

  return frame(lines, useColor);
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

  return frame(lines, useColor);
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

  return frame(lines, useColor);
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

  return frame(lines, useColor);
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

  return frame(lines, useColor);
}
