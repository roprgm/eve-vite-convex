export const MODEL_OPTIONS = [
  { label: "Deepseek V4 Flash", value: "deepseek/deepseek-v4-flash" },
  { label: "GPT-5 Nano", value: "openai/gpt-5-nano" },
  { label: "Gemini 3 Flash", value: "google/gemini-3-flash" },
  { label: "Claude Haiku 4.5", value: "anthropic/claude-haiku-4.5" },
] as const;

export type ModelId = (typeof MODEL_OPTIONS)[number]["value"];

export const DEFAULT_MODEL_ID: ModelId = MODEL_OPTIONS[0].value;
export const MODEL_HEADER = "x-eve-model";

export function getModelOption(value: unknown) {
  return MODEL_OPTIONS.find((model) => model.value === value);
}

export function isModelId(value: unknown): value is ModelId {
  return getModelOption(value) !== undefined;
}
