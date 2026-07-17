import { defineAgent } from "eve";

export default defineAgent({
  model: "openai/gpt-5.4-mini",
  limits: {
    maxInputTokensPerSession: 200,
    maxOutputTokensPerSession: 400,
  },
});
