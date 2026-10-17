import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { describe, test } from "node:test";
import { createTerminalInput } from "../../src/terminal-input.js";

function createInteractiveTerminal() {
  const input = new PassThrough();
  input.isTTY = true;
  input.setRawMode = () => input;

  const output = new PassThrough();
  const written = [];
  output.on("data", (chunk) => written.push(chunk.toString()));

  return {
    input,
    output,
    written,
    terminal: createTerminalInput(input, output),
  };
}

async function typeAndSubmit(input, answer, value) {
  await new Promise((resolve) => setImmediate(resolve));
  input.write(value);
  return answer;
}

describe("Zion terminal input security suite", () => {
  test("secret characters are never echoed to the terminal", async () => {
    const { input, output, written, terminal } = createInteractiveTerminal();
    const secret = "NeverEchoThisSecret#2026";

    try {
      const answer = terminal.read("Senha: ", { secret: true });
      assert.equal(
        await typeAndSubmit(input, answer, `${secret}\r`),
        secret,
      );
      assert.equal(written.join(""), "Senha: \n");
      assert.doesNotMatch(written.join(""), new RegExp(secret));
    } finally {
      terminal.close();
      input.destroy();
      output.destroy();
    }
  });

  test("input is capped at 128 characters and excess input is rejected", async () => {
    const { input, output, terminal } = createInteractiveTerminal();

    try {
      const answer = terminal.read("Entrada: ");
      const result = await typeAndSubmit(input, answer, `${"x".repeat(129)}\r`);

      assert.equal(result, "x".repeat(128));
    } finally {
      terminal.close();
      input.destroy();
      output.destroy();
    }
  });

  test("Ctrl+C cancels input without returning a partial secret", async () => {
    const { input, output, written, terminal } = createInteractiveTerminal();

    try {
      const answer = terminal.read("Senha: ", { secret: true });
      await new Promise((resolve) => setImmediate(resolve));
      input.write("PartialSecret");
      input.write("\u0003");

      assert.equal(await answer, null);
      assert.doesNotMatch(written.join(""), /PartialSecret/);
    } finally {
      terminal.close();
      input.destroy();
      output.destroy();
    }
  });

  test("rejects overlapping reads instead of replacing pending input", async () => {
    const { input, output, terminal } = createInteractiveTerminal();

    try {
      const firstRead = terminal.read("Primeira: ");
      await assert.rejects(terminal.read("Segunda: "), /leitura.*andamento/);
      await typeAndSubmit(input, firstRead, "ok\r");
      assert.equal(await firstRead, "ok");
    } finally {
      terminal.close();
      input.destroy();
      output.destroy();
    }
  });
});
