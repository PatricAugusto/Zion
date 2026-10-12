const snapshot = {
  sectors: [
    { id: "A1", name: "ÓRBITA BAIXA", status: "NOMINAL" },
    { id: "B2", name: "ÓRBITA MÉDIA", status: "OBSERVAÇÃO" },
    { id: "C3", name: "REGIÃO LUNAR", status: "NOMINAL" },
  ],
  objects: [
    { id: "SIM-01", name: "PLATAFORMA A", sector: "ÓRBITA BAIXA", status: "ESTÁVEL" },
    { id: "SIM-02", name: "PLATAFORMA B", sector: "ÓRBITA MÉDIA", status: "OBSERVAÇÃO" },
    { id: "SIM-03", name: "SONDA C", sector: "REGIÃO LUNAR", status: "ESTÁVEL" },
  ],
  alerts: [
    {
      level: "INFO",
      message: "Cenário demonstrativo carregado com dados fictícios.",
    },
    {
      level: "AVISO",
      message: "Setor B2 marcado para observação no cenário simulado.",
    },
  ],
};

function colorize(text, color, useColor) {
  if (!useColor) return text;
  return `\u001b[${color}m${text}\u001b[0m`;
}

function frame(lines, useColor) {
  const width = Math.max(...lines.map((line) => line.length));
  const border = `+${"-".repeat(width + 2)}+`;
  const body = lines.map((line) => `| ${line.padEnd(width)} |`);

  return [
    colorize(border, "36", useColor),
    ...body,
    colorize(border, "36", useColor),
  ].join("\n");
}

export function renderDashboard(useColor = false) {
  const sectorLines = snapshot.sectors.map(
    (sector) => `[${sector.id}] ${sector.name.padEnd(16)} ${sector.status}`,
  );
  const lines = [
    "ZION // PAINEL DE CONSCIÊNCIA ESPACIAL",
    "MODO: SIMULAÇÃO | CONEXÃO: NENHUMA | DADOS: FICTÍCIOS",
    "",
    "MAPA ESQUEMÁTICO - SEM ESCALA",
    ...sectorLines,
    "",
    `OBJETOS MONITORADOS: ${snapshot.objects.length}`,
    `ALERTAS NO CENÁRIO: ${snapshot.alerts.length}`,
    `CICLO: CENÁRIO INICIAL`,
    "",
    "Nenhuma telemetria ou capacidade de controle real está conectada.",
  ];

  return frame(lines, useColor);
}

export function renderObjects(useColor = false) {
  const lines = [
    "OBJETOS DO CENÁRIO SIMULADO",
    "",
    ...snapshot.objects.map(
      (object) =>
        `${object.id} | ${object.name} | ${object.sector} | ${object.status}`,
    ),
    "",
    "Identificadores e estados acima são demonstrativos.",
  ];

  return frame(lines, useColor);
}

export function renderAlerts(useColor = false) {
  const lines = [
    "ALERTAS DO CENÁRIO SIMULADO",
    "",
    ...snapshot.alerts.map((alert) => `[${alert.level}] ${alert.message}`),
    "",
    "Alertas não representam eventos espaciais reais.",
  ];

  return frame(lines, useColor);
}

export function renderProtocols(useColor = false) {
  const lines = [
    "PRINCÍPIOS DE SEGURANÇA DO ZION",
    "",
    "01. Simulação identificada de forma explícita.",
    "02. Dados demonstrativos, sem fontes externas.",
    "03. Observação informativa, sem comandos de controle.",
    "04. Nenhuma ação é enviada a sistemas reais.",
  ];

  return frame(lines, useColor);
}
