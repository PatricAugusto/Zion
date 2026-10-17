import { isCancel, password, text } from "@clack/prompts";

export function createPromptInput(input = process.stdin, output = process.stdout) {
  return Object.freeze({
    async read(prompt, { secret = false } = {}) {
      const message = prompt.trim().replace(/:\s*$/, "");
      const validate = (value) =>
        typeof value === "string" && value.length > 128
          ? "O limite para esta entrada é de 128 caracteres."
          : undefined;
      const options = { message, validate, input, output };
      const answer = secret
        ? await password(options)
        : await text(options);

      if (isCancel(answer)) return null;

      const value = typeof answer === "string" ? answer : "";
      return secret ? value : value.trim();
    },
  });
}
