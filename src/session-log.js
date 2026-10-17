const MAX_ENTRIES = 50;

const events = new Map([
  ["APP_STARTED", { level: "INFO", message: "Sessão Zion iniciada." }],
  ["INVALID_INPUT", { level: "AVISO", message: "Entrada de menu rejeitada." }],
  ["INPUT_LIMIT_REACHED", {
    level: "AVISO",
    message: "Sessão encerrada após entradas inválidas consecutivas.",
  }],
  ["INPUT_ENDED", { level: "INFO", message: "Entrada do terminal encerrada." }],
  ["APP_STOPPED", { level: "INFO", message: "Sessão Zion encerrada." }],
]);

const screens = new Map([
  ["OBJECTS", "Objetos"],
  ["ALERTS", "Alertas"],
  ["INTEGRITY", "Integridade"],
  ["SECTORS", "Análise de setores"],
  ["ALERT_SUMMARY", "Resumo de alertas"],
  ["SECURITY", "Princípios de segurança"],
  ["OBSERVABILITY", "Séries de observabilidade"],
  ["LEARNING", "Leitura guiada"],
  ["SESSION_LOG", "Registro de sessão"],
]);

export function createSessionLog(clock = () => new Date()) {
  const entries = [];
  let nextSequence = 1;
  let discardedCount = 0;

  return Object.freeze({
    record(eventKey, screenKey) {
      let entry;

      if (eventKey === "SCREEN_OPENED" && screens.has(screenKey)) {
        entry = {
          level: "INFO",
          message: `Tela aberta: ${screens.get(screenKey)}.`,
        };
      } else if (events.has(eventKey)) {
        entry = events.get(eventKey);
      } else {
        throw new TypeError("Tipo de evento de sessão inválido.");
      }

      const timestamp = clock();
      if (!(timestamp instanceof Date) || !Number.isFinite(timestamp.getTime())) {
        throw new TypeError("O relógio da sessão deve retornar uma data válida.");
      }

      entries.push(
        Object.freeze({
          sequence: nextSequence,
          timestamp: timestamp.toISOString(),
          level: entry.level,
          message: entry.message,
        }),
      );
      nextSequence += 1;

      if (entries.length > MAX_ENTRIES) {
        entries.shift();
        discardedCount += 1;
      }
    },

    read() {
      return Object.freeze({
        entries: Object.freeze(entries.slice()),
        discardedCount,
        capacity: MAX_ENTRIES,
      });
    },
  });
}
