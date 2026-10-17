import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { createCliTestContext } from "../../scripts/cli-test-support.js";

const creatorPassword = "CreatorPassphrase#2026";
let cli;

describe("Zion CLI integration tests", () => {
  before(() => {
    cli = createCliTestContext();
  });

  after(() => {
    cli.close();
  });

  test("first run provisions Creator and all menu views work", () => {
    const result = cli.run(
      `${creatorPassword}\n${creatorPassword}\n1\n\n2\n\n3\n\n4\n\n5\n\n6\n\n7\n\n8\n\n9\n\na\n3\nq\nq\n`,
    ).result;

    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Conta Creator provisionada com segurança/);
    assert.match(result.stdout, /OBJETOS DO CENÁRIO SIMULADO/);
    assert.match(result.stdout, /ALERTAS DO CENÁRIO SIMULADO/);
    assert.match(result.stdout, /INTEGRIDADE DOS DADOS DO CENÁRIO/);
    assert.match(result.stdout, /ANÁLISE COMPARATIVA DE SETORES/);
    assert.match(result.stdout, /RESUMO DE ALERTAS SIMULADOS/);
    assert.match(result.stdout, /PRINCÍPIOS DE SEGURANÇA DO ZION/);
    assert.match(result.stdout, /OBSERVABILIDADE DO CENÁRIO/);
    assert.match(result.stdout, /LEITURA GUIADA DAS SÉRIES/);
    assert.match(result.stdout, /REGISTRO DE SESSÃO LOCAL/);
    assert.match(result.stdout, /AUDITORIA LOCAL/);
    assert.match(result.stdout, /Zion encerrado\. Nenhuma ação externa foi executada\./);
    assert.doesNotMatch(result.stdout, /\u001b/);
  });

  test("session log records rejected menu events without echoing user input", () => {
    const secret = "PRIVATE_INPUT_SHOULD_NOT_BE_LOGGED";
    const result = cli.run(
      `${creatorPassword}\n${creatorPassword}\n${secret}\n9\n\nq\n`,
    ).result;

    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Entrada de menu rejeitada/);
    assert.doesNotMatch(result.stdout, new RegExp(secret));
  });

  test("unknown and inherited object-property choices are rejected", () => {
    const result = cli.run(
      `${creatorPassword}\n${creatorPassword}\nconstructor\ntoString\n__proto__\n10\nq\n`,
    ).result;

    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    assert.equal((result.stdout.match(/Opção inválida/g) ?? []).length, 4);
    assert.doesNotMatch(result.stdout, /function Object|PRINCÍPIOS DE SEGURANÇA DO ZION/);
  });

  test("only Creator can create accounts and user accounts cannot open admin tools", () => {
    const setup = cli.run(
      `${creatorPassword}\n${creatorPassword}\na\n1\nalice\nAlicePassword#2026\nAlicePassword#2026\nq\nq\n`,
    );

    assert.equal(setup.result.error, undefined);
    assert.equal(setup.result.status, 0, `${setup.result.stderr}\n${setup.result.stdout}`);
    assert.match(setup.result.stdout, /Conta "alice" criada como usuário comum/);
    assert.doesNotMatch(setup.result.stdout, /AlicePassword#2026/);

    const userRun = cli.run(
      `ALICE\nAlicePassword#2026\na\nq\n`,
      setup.databaseUrl,
    ).result;
    assert.equal(userRun.error, undefined);
    assert.equal(userRun.status, 0, userRun.stderr);
    assert.doesNotMatch(userRun.stdout, /\[a\] Administração/);
    assert.match(userRun.stdout, /Opção inválida/);
  });

  test("five failed logins lock the account and return a generic response", () => {
    const setup = cli.run(`${creatorPassword}\n${creatorPassword}\nq\n`);
    assert.equal(setup.result.status, 0, `${setup.result.stderr}\n${setup.result.stdout}`);

    const attempts = Array.from(
      { length: 5 },
      () => `creator\nWrongPassphrase#2026\n`,
    ).join("");
    const locked = cli.run(attempts, setup.databaseUrl).result;
    assert.equal(locked.error, undefined);
    assert.equal(locked.status, 1);
    assert.match(locked.stdout, /Credenciais inválidas ou conta temporariamente indisponível/);
    assert.doesNotMatch(locked.stdout, /CreatorPassphrase#2026|WrongPassphrase#2026/);
  });

  test("end of input cancels initial setup without hanging", () => {
    const result = cli.run("").result;

    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Autenticação não concluída/);
  });
});
