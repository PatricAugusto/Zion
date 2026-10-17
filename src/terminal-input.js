import { emitKeypressEvents } from "node:readline";
import { createInterface } from "node:readline/promises";

export function createTerminalInput(input = process.stdin, output = process.stdout) {
  const isInteractive = Boolean(input.isTTY && input.setRawMode);
  let pendingRead;
  let iterator;
  let readline;

  function onKeypress(text, key = {}) {
    if (!pendingRead) return;
    if (key.ctrl && (key.name === "c" || key.name === "d")) {
      if (!pendingRead.secret) output.write("\n");
      const resolve = pendingRead.resolve;
      pendingRead = undefined;
      resolve(null);
      return;
    }
    if (key.name === "return" || key.name === "enter") {
      output.write("\n");
      const resolve = pendingRead.resolve;
      const value = pendingRead.value;
      pendingRead = undefined;
      resolve(value);
      return;
    }
    if (key.name === "backspace" || key.name === "delete") {
      const characters = Array.from(pendingRead.value);
      if (characters.length > 0) {
        characters.pop();
        pendingRead.value = characters.join("");
        if (!pendingRead.secret) output.write("\b \b");
      }
      return;
    }
    if (!text || key.ctrl || key.meta || /[\u0000-\u001f\u007f]/.test(text)) return;
    if (pendingRead.value.length + text.length > 128) {
      output.write("\u0007");
      return;
    }
    pendingRead.value += text;
    if (!pendingRead.secret) output.write(text);
  }

  if (isInteractive) {
    emitKeypressEvents(input);
    input.on("keypress", onKeypress);
    input.setRawMode(true);
    input.resume();
  } else {
    readline = createInterface({
      input,
      output,
    });
    iterator = readline[Symbol.asyncIterator]();
  }

  return Object.freeze({
    async read(prompt, { secret = false } = {}) {
      if (pendingRead) throw new Error("Já existe uma leitura de terminal em andamento.");
      output.write(prompt);
      if (!isInteractive) {
        const answer = await iterator.next();
        return answer.done ? null : answer.value;
      }
      return new Promise((resolve) => {
        pendingRead = { resolve, secret, value: "" };
      });
    },

    close() {
      if (isInteractive) {
        input.off("keypress", onKeypress);
        input.setRawMode(false);
      } else {
        readline.close();
      }
    },
  });
}
