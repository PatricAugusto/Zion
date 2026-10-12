import assert from "node:assert/strict";
import test from "node:test";
import {
  renderAlerts,
  renderDashboard,
  renderObjects,
  renderProtocols,
} from "../../src/dashboard.js";

test("dashboard identifies the data as simulated and disconnected", () => {
  const output = renderDashboard();

  assert.match(output, /MODO: SIMULAÇÃO/);
  assert.match(output, /CONEXÃO: NENHUMA/);
  assert.match(output, /DADOS: FICTÍCIOS/);
  assert.match(
    output,
    /Nenhuma telemetria ou capacidade de controle real está conectada\./,
  );
});

test("dashboard reports all sectors and derives object and alert counts", () => {
  const output = renderDashboard();

  assert.match(output, /ÓRBITA BAIXA/);
  assert.match(output, /ÓRBITA MÉDIA/);
  assert.match(output, /REGIÃO LUNAR/);
  assert.match(output, /OBJETOS MONITORADOS: 3/);
  assert.match(output, /ALERTAS NO CENÁRIO: 2/);
});

test("object view shows only the fixed simulated object set", () => {
  const output = renderObjects();

  assert.match(output, /OBJETOS DO CENÁRIO SIMULADO/);
  assert.match(output, /SIM-01 \| PLATAFORMA A/);
  assert.match(output, /SIM-02 \| PLATAFORMA B/);
  assert.match(output, /SIM-03 \| SONDA C/);
  assert.match(output, /são demonstrativos/);
});

test("alert view labels alerts as simulated", () => {
  const output = renderAlerts();

  assert.match(output, /ALERTAS DO CENÁRIO SIMULADO/);
  assert.match(output, /\[INFO\]/);
  assert.match(output, /\[AVISO\]/);
  assert.match(output, /não representam eventos espaciais reais/);
});

test("protocol view states the no-control safety boundary", () => {
  const output = renderProtocols();

  assert.match(output, /PRINCÍPIOS DE SEGURANÇA DO ZION/);
  assert.match(output, /sem comandos de controle/);
  assert.match(output, /Nenhuma ação é enviada a sistemas reais/);
});

test("color is opt-in and only adds the fixed cyan border escape sequence", () => {
  const plainOutput = renderDashboard();
  const coloredOutput = renderDashboard(true);

  assert.doesNotMatch(plainOutput, /\u001b/);
  assert.match(coloredOutput, /^\u001b\[36m\+/);
  assert.match(coloredOutput, /\u001b\[0m\r?\n\| ZION/);
  assert.equal(
    coloredOutput.replace(/\u001b\[(?:36|0)m/g, ""),
    plainOutput,
  );
});
