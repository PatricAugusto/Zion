import { isCancel, intro, outro, select } from "@clack/prompts";
import chalk from "chalk";
import ora from "ora";
import {
  renderAlertAnalysis,
  renderAlerts,
  renderAnalysis,
  renderAuditEntries,
  renderDashboard,
  renderLearning,
  renderObjects,
  renderObservability,
  renderProtocols,
  renderSectorAnalysis,
  renderSessionLog,
  renderAdminUsers,
} from "./dashboard.js";
import {
  authenticate,
  createUser,
  ensureCreatorAccount,
  listAuditEntries,
  listUsers,
  recordAuditEntry,
} from "./auth.js";
import { prisma } from "./db.js";
import { createMenuAttemptGuard, MAX_CONSECUTIVE_INVALID_ATTEMPTS } from "./menu-guard.js";
import { createSessionLog } from "./session-log.js";
import { createTerminalInput } from "./terminal-input.js";
import { createPromptInput } from "./prompt-input.js";

const isInteractive = Boolean(
  process.stdin.isTTY &&
  process.stdout.isTTY &&
  process.stdin.setRawMode,
);
chalk.level = process.stdout.isTTY &&
  process.env.NO_COLOR === undefined &&
  process.env.TERM !== "dumb"
  ? 1
  : 0;
const terminalInput = isInteractive ? null : createTerminalInput();
const promptInput = isInteractive ? createPromptInput() : null;
const sessionLog = createSessionLog();
const menuAttemptGuard = createMenuAttemptGuard();
const useColor = chalk.level > 0;

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

function menuFor(user) {
  const lines = [
    "\n[1] Objetos  [2] Alertas  [3] Integridade  [4] Setores",
    "[5] Resumo  [6] Segurança  [7] Painel  [8] Guia  [9] Sessão",
  ];
  if (user.role === "MASTER") lines.push("[a] Administração");
  lines.push("[q] Sair");
  return lines.join("\n");
}

function mainMenuOptions(user) {
  const options = [
    { value: "1", label: "Objetos", hint: "Explorar os registros fictícios" },
    { value: "2", label: "Alertas", hint: "Consultar os avisos simulados" },
    { value: "3", label: "Integridade", hint: "Verificações estruturais locais" },
    { value: "4", label: "Setores", hint: "Comparar contagens do cenário" },
    { value: "5", label: "Resumo de alertas", hint: "Distribuição dos rótulos didáticos" },
    { value: "6", label: "Segurança", hint: "Princípios e limites do Zion" },
    { value: "7", label: "Observabilidade", hint: "Séries e ciclos demonstrativos" },
    { value: "8", label: "Leitura guiada", hint: "Como interpretar as séries" },
    { value: "9", label: "Registro da sessão", hint: "Eventos locais desta execução" },
  ];
  if (user.role === "MASTER") {
    options.push({ value: "a", label: "Administração", hint: "Contas e auditoria do Creator" });
  }
  options.push({ value: "q", label: "Sair" });
  return options;
}

async function selectMenuChoice(message, options, initialValue) {
  const choice = await select({ message, options, initialValue });
  return isCancel(choice) ? null : choice;
}

async function runTask(label, operation) {
  if (!isInteractive) return operation();
  const spinner = ora({ text: label, color: useColor ? "cyan" : "white" }).start();
  try {
    const result = await operation();
    spinner.succeed(chalk.green(label));
    return result;
  } catch (error) {
    spinner.fail(chalk.red(`${label} — falhou`));
    throw error;
  }
}

async function readAnswer(prompt, options = {}) {
  if (isInteractive) return promptInput.read(prompt, options);
  const answer = await terminalInput.read(prompt, options);
  return options.secret ? answer : answer?.trim() ?? null;
}

async function readPasswordPair(label) {
  const password = await readAnswer(`${label}: `, { secret: true });
  if (password === null) return null;
  const confirmPassword = await readAnswer("Confirme a senha: ", { secret: true });
  if (confirmPassword === null) return null;
  return { password, confirmPassword };
}

async function authenticateAtStartup() {
  const existingUsers = await prisma.user.count();
  if (existingUsers === 0) {
    console.log("Primeira execução: configure a conta Admin Master Creator.");
    const credentials = await readPasswordPair("Senha do Creator");
    if (!credentials) return null;
    const created = await ensureCreatorAccount(prisma, credentials);
    if (!created) throw new Error("O provisionamento inicial foi interrompido.");
    console.log("Conta Creator provisionada com segurança.");
    return authenticate(prisma, "creator", credentials.password);
  }

  const creator = await prisma.user.findUnique({
    where: { username: "creator" },
    select: { id: true },
  });
  if (!creator) {
    throw new Error(
      "A conta Creator não existe neste banco. A inicialização foi interrompida; procure o administrador do banco.",
    );
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const username = await readAnswer("Usuário: ");
    if (username === null) return null;
    const password = await readAnswer("Senha: ", { secret: true });
    if (password === null) return null;
    const user = await authenticate(prisma, username, password);
    if (user) return user;
    console.log("Credenciais inválidas ou conta temporariamente indisponível.");
  }
  return null;
}

async function logInvalidInput(user) {
  sessionLog.record("INVALID_INPUT");
  await recordAuditEntry(prisma, user.id, "INVALID_INPUT");
  if (menuAttemptGuard.recordInvalidAttempt()) {
    sessionLog.record("INPUT_LIMIT_REACHED");
    console.log(
      `Limite de ${MAX_CONSECUTIVE_INVALID_ATTEMPTS} entradas inválidas consecutivas atingido. Sessão encerrada.`,
    );
    return true;
  }
  console.log("Opção inválida.");
  return false;
}

async function runAdminMenu(user) {
  while (true) {
    let choice;
    if (isInteractive) {
      choice = await selectMenuChoice("Admin Master", [
        { value: "1", label: "Criar conta", hint: "Cadastrar usuário comum" },
        { value: "2", label: "Listar contas" },
        { value: "3", label: "Consultar auditoria" },
        { value: "q", label: "Voltar" },
      ], "q");
    } else {
      console.log("\nADMIN MASTER");
      console.log("[1] Criar conta  [2] Listar contas  [3] Auditoria  [q] Voltar");
      choice = (await readAnswer("admin> "))?.toLowerCase();
    }
    if (choice === null || choice === "q") return true;

    if (!["1", "2", "3"].includes(choice)) {
      if (await logInvalidInput(user)) return false;
      continue;
    }
    menuAttemptGuard.recordValidChoice();

    if (choice === "1") {
      const username = await readAnswer("Novo nome de usuário: ");
      if (username === null) return true;
      const credentials = await readPasswordPair("Senha");
      if (!credentials) return true;
      try {
        const created = await createUser(
          prisma,
          user,
          username,
          credentials.password,
          credentials.confirmPassword,
        );
        console.log(chalk.green(`Conta "${created.username}" criada como usuário comum.`));
      } catch (error) {
        if (error?.code === "P2002") {
          console.log(chalk.yellow("Esse nome de usuário já está em uso."));
          continue;
        }
        if (error instanceof TypeError) {
          console.log(chalk.yellow(error.message));
          continue;
        }
        throw error;
      }
    } else if (choice === "2") {
      console.log(renderAdminUsers(await listUsers(prisma, user), useColor));
    } else {
      console.log(renderAuditEntries(await listAuditEntries(prisma, user), useColor));
    }
  }
}

async function runApplication(user) {
  sessionLog.record("APP_STARTED");
  let running = true;

  while (running) {
    console.log(renderDashboard(useColor, process.stdout.columns ?? 80));
    let answer;
    if (isInteractive) {
      answer = await selectMenuChoice("Escolha uma tela", mainMenuOptions(user), "1");
    } else {
      console.log(menuFor(user));
      answer = await readAnswer("zion> ");
    }
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
    if (choice === "a" && user.role === "MASTER") {
      menuAttemptGuard.recordValidChoice();
      if (!await runAdminMenu(user)) running = false;
      continue;
    }

    const view = views.get(choice);
    if (!view) {
      if (await logInvalidInput(user)) running = false;
      continue;
    }

    menuAttemptGuard.recordValidChoice();
    sessionLog.record("SCREEN_OPENED", view.key);
    await recordAuditEntry(prisma, user.id, `SCREEN_${view.key}_OPENED`);
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
}

async function main() {
  let user = null;
  try {
    if (isInteractive) intro(`${chalk.bold.cyan("ZION")} ${chalk.dim("· console local demonstrativo")}`);
    await runTask("Conectando ao banco local", () => prisma.$connect());
    user = await authenticateAtStartup();
    if (!user) {
      console.error("Autenticação não concluída. Acesso ao Zion encerrado.");
      process.exitCode = 1;
      return;
    }
    await runApplication(user);
  } catch (error) {
    console.error(`Falha ao iniciar ou executar o Zion: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (user) {
      try {
        sessionLog.record("APP_STOPPED");
        await recordAuditEntry(prisma, user.id, "SESSION_ENDED");
      } catch (error) {
        console.error(`Falha ao registrar o encerramento da sessão: ${error.message}`);
        process.exitCode = 1;
      }
    }
    if (terminalInput) terminalInput.close();
    await prisma.$disconnect();
  }
  if (isInteractive) outro("Sessão encerrada com segurança.");
}

await main();
