import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const entryPoint = fileURLToPath(new URL("../../src/main.js", import.meta.url));

function runCli(input) {
  return spawnSync(process.execPath, [entryPoint], {
    encoding: "utf8",
    input,
    timeout: 5000,
    maxBuffer: 1024 * 1024,
  });
}

test("all menu choices open their view and quit cleanly", () => {
  const result = runCli("1\n\n2\n\n3\n\n4\n\n5\n\n6\n\n7\n\n8\n\nq\n");

  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /OBJETOS DO CENÁRIO SIMULADO/);
  assert.match(result.stdout, /ALERTAS DO CENÁRIO SIMULADO/);
  assert.match(result.stdout, /INTEGRIDADE DOS DADOS DO CENÁRIO/);
  assert.match(result.stdout, /ANÁLISE COMPARATIVA DE SETORES/);
  assert.match(result.stdout, /RESUMO DE ALERTAS SIMULADOS/);
  assert.match(result.stdout, /PRINCÍPIOS DE SEGURANÇA DO ZION/);
  assert.match(result.stdout, /OBSERVABILIDADE DO CENÁRIO/);
  assert.match(result.stdout, /LEITURA GUIADA DAS SÉRIES/);
  assert.match(result.stdout, /Resumo de alertas/);
  assert.match(result.stdout, /Zion encerrado\. Nenhuma ação externa foi executada\./);
  assert.doesNotMatch(result.stdout, /\u001b/);
});

test("unknown and inherited object-property choices are rejected", () => {
  const result = runCli("constructor\ntoString\n__proto__\n9\nq\n");

  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal((result.stdout.match(/Opção inválida/g) ?? []).length, 4);
  assert.doesNotMatch(result.stdout, /function Object|PRINCÍPIOS DE SEGURANÇA DO ZION/);
});

test("end of input exits without hanging or executing an action", () => {
  const result = runCli("");

  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Zion encerrado\. Nenhuma ação externa foi executada\./);
});
