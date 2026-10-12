import { createInterface } from "node:readline/promises";
import {
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
} from "./dashboard.js";
import { createSessionLog } from "./session-log.js";

const terminal = createInterface({
  input: process.stdin,
  output: process.stdout,
});
const answers = terminal[Symbol.asyncIterator]();
const sessionLog = createSessionLog();
const useColor =
  Boolean(process.stdout.isTTY) &&
  process.env.NO_COLOR === undefined &&
  process.env.TERM !== "dumb";

const views = new Map([
  ["1", { key: "OBJECTS", render: renderObjects }],
  ["2", { key: "ALERTS", render: renderAlerts }],
  ["3", { key: "INTEGRITY", render: renderAnalysis }],
  ["4", { key: "SECTORS", render: renderSectorAnalysis }],
  ["5", { key: "ALERT_SUMMARY", render: renderAlertAnalysis }],
  ["6", { key: "SECURITY", render: renderProtocols }],
  ["7", { key: "OBSERVABILITY", render: renderObservability }],
  ["8", { key: "LEARNING", render: renderLearning }],
  ["9", {
    key: "SESSION_LOG",
    render: () => renderSessionLog(sessionLog.read(), useColor),
  }],
]);

const menu =
  "\n[1] Objetos  [2] Alertas  [3] Integridade  [4] Setores\n" +
  "[5] Resumo de alertas  [6] Segurança  [7] Séries  [8] Leitura guiada\n" +
  "[9] Registro de sessão  [q] Sair";

async function readAnswer(prompt) {
  process.stdout.write(prompt);
  const answer = await answers.next();
  return answer.done ? null : answer.value.trim();
}

try {
  sessionLog.record("APP_STARTED");
  let running = true;

  while (running) {
    console.log(renderDashboard(useColor, process.stdout.columns ?? 80));
    console.log(useColor ? `\u001b[96m${menu}\u001b[0m` : menu);
    const answer = await readAnswer("zion> ");
    if (answer === null) {
      sessionLog.record("INPUT_ENDED");
      running = false;
      continue;
    }
    const choice = answer.toLowerCase();

    if (choice === "q") {
      running = false;
      continue;
    }

    const view = views.get(choice);
    if (!view) {
      sessionLog.record("INVALID_INPUT");
      console.log("\nOpção inválida. Escolha 1–9 ou q.\n");
      continue;
    }

    sessionLog.record("SCREEN_OPENED", view.key);
    const output = view.key === "SESSION_LOG"
      ? view.render()
      : view.render(useColor);
    console.log(`\n${output}\n`);
    const confirmation = await readAnswer("Pressione Enter para voltar ao painel...");
    if (confirmation === null) {
      sessionLog.record("INPUT_ENDED");
      running = false;
    }
    console.log();
  }

  console.log("Zion encerrado. Nenhuma ação externa foi executada.");
} finally {
  sessionLog.record("APP_STOPPED");
  terminal.close();
}
