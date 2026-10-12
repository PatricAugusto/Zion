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
  renderSectorAnalysis,
} from "./dashboard.js";

const terminal = createInterface({
  input: process.stdin,
  output: process.stdout,
});
const answers = terminal[Symbol.asyncIterator]();
const useColor =
  Boolean(process.stdout.isTTY) &&
  process.env.NO_COLOR === undefined &&
  process.env.TERM !== "dumb";

const views = new Map([
  ["1", renderObjects],
  ["2", renderAlerts],
  ["3", renderAnalysis],
  ["4", renderSectorAnalysis],
  ["5", renderAlertAnalysis],
  ["6", renderProtocols],
  ["7", renderObservability],
  ["8", renderLearning],
]);

const menu =
  "\n[1] Objetos  [2] Alertas  [3] Integridade  [4] Setores\n" +
  "[5] Resumo de alertas  [6] Segurança  [7] Séries  [8] Leitura guiada\n" +
  "[q] Sair";

async function readAnswer(prompt) {
  process.stdout.write(prompt);
  const answer = await answers.next();
  return answer.done ? null : answer.value.trim();
}

try {
  let running = true;

  while (running) {
    console.log(renderDashboard(useColor, process.stdout.columns ?? 80));
    console.log(useColor ? `\u001b[96m${menu}\u001b[0m` : menu);
    const answer = await readAnswer("zion> ");
    if (answer === null) {
      running = false;
      continue;
    }
    const choice = answer.toLowerCase();

    if (choice === "q") {
      running = false;
      continue;
    }

    const renderView = views.get(choice);
    if (!renderView) {
      console.log("\nOpção inválida. Escolha 1–8 ou q.\n");
      continue;
    }

    console.log(`\n${renderView(useColor)}\n`);
    const confirmation = await readAnswer("Pressione Enter para voltar ao painel...");
    if (confirmation === null) running = false;
    console.log();
  }

  console.log("Zion encerrado. Nenhuma ação externa foi executada.");
} finally {
  terminal.close();
}
