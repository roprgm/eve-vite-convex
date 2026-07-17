import { create } from "zustand";

import { DEFAULT_MODEL_ID, type ModelId } from "@/lib/models";

export const NEW_CHAT_DRAFT = "new";

type ChatStore = {
  readonly drafts: Record<string, string>;
  readonly selectedModel: ModelId;
  readonly setDraft: (key: string, value: string) => void;
  readonly setSelectedModel: (model: ModelId) => void;
};

export const useChatStore = create<ChatStore>()((set) => ({
  drafts: {},
  selectedModel: DEFAULT_MODEL_ID,
  setDraft: (key, value) => set(({ drafts }) => ({ drafts: { ...drafts, [key]: value } })),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
}));
