import { defineAgent } from "eve";

export default defineAgent({
  model: "openai/gpt-5.4-mini",
  limits: {
    maxInputTokensPerSession: 2_000,
    maxOutputTokensPerSession: 20_000,
  },
});
