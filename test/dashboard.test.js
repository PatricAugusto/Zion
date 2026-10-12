import assert from "node:assert/strict";
import test from "node:test";
import {
  renderAlerts,
  renderDashboard,
  renderObjects,
  renderProtocols,
} from "../src/dashboard.js";

test("dashboard identifies itself as a simulation with no live connection", () => {
  const output = renderDashboard();

  assert.match(output, /MODO: SIMULAÇÃO/);
  assert.match(output, /CONEXÃO: NENHUMA/);
  assert.match(output, /DADOS: FICTÍCIOS/);
  assert.match(output, /Nenhuma telemetria ou capacidade de controle real está conectada\./);
});

test("dashboard displays the simulated sectors and object and alert counts", () => {
  const output = renderDashboard();

  assert.match(output, /ÓRBITA BAIXA/);
  assert.match(output, /ÓRBITA MÉDIA/);
  assert.match(output, /REGIÃO LUNAR/);
  assert.match(output, /OBJETOS MONITORADOS: 3/);
  assert.match(output, /ALERTAS NO CENÁRIO: 2/);
});

test("detail views contain only clearly labeled simulated information", () => {
  assert.match(renderObjects(), /OBJETOS DO CENÁRIO SIMULADO/);
  assert.match(renderAlerts(), /ALERTAS DO CENÁRIO SIMULADO/);
  assert.match(renderProtocols(), /PRINCÍPIOS DE SEGURANÇA DO ZION/);
  assert.match(renderProtocols(), /sem comandos de controle/);
});
