import { createInterface } from "node:readline/promises";
import {
  renderAlerts,
  renderDashboard,
  renderObjects,
  renderProtocols,
} from "./dashboard.js";

const terminal = createInterface({
  input: process.stdin,
  output: process.stdout,
});
const answers = terminal[Symbol.asyncIterator]();
const useColor = Boolean(process.stdout.isTTY);

const views = new Map([
  ["1", renderObjects],
  ["2", renderAlerts],
  ["3", renderProtocols],
]);

async function readAnswer(prompt) {
  process.stdout.write(prompt);
  const answer = await answers.next();
  return answer.done ? null : answer.value.trim();
}

try {
  let running = true;

  while (running) {
    console.log(renderDashboard(useColor));
    console.log("\n[1] Objetos  [2] Alertas  [3] Princípios  [q] Sair");
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
      console.log("\nOpção inválida. Escolha 1, 2, 3 ou q.\n");
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
