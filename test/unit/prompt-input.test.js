import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { describe, test } from "node:test";
import { createPromptInput } from "../../src/prompt-input.js";

function createTerminal() {
  const input = new PassThrough();
  input.isTTY = true;
  input.setRawMode = () => input;

  const output = new PassThrough();
  output.isTTY = true;
  output.columns = 80;
  output.rows = 24;

  return { input, output, prompts: createPromptInput(input, output) };
}

async function enterPrompt(input, answerPromise, value = "\r") {
  await new Promise((resolve) => setImmediate(resolve));
  input.write(value);
  return answerPromise;
}

describe("Zion interactive prompt input", () => {
  test("submitting an empty text prompt returns an empty value without throwing", async () => {
    const { input, prompts } = createTerminal();

    const result = await enterPrompt(
      input,
      prompts.read("Pressione Enter para voltar ao painel..."),
    );

    assert.equal(result, "");
  });

  test("submitting an empty secret prompt remains distinct from cancellation", async () => {
    const { input, prompts } = createTerminal();

    const result = await enterPrompt(
      input,
      prompts.read("Senha:", { secret: true }),
    );

    assert.equal(result, "");
  });

  test("text prompt trims submitted values", async () => {
    const { input, prompts } = createTerminal();

    const result = await enterPrompt(
      input,
      prompts.read("Nome de usuário:"),
      "  zion-user  \r",
    );

    assert.equal(result, "zion-user");
  });
});
