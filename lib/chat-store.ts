import { create } from "zustand";

import { DEFAULT_MODEL_ID, type ModelId } from "@/lib/models";

type ChatStore = {
  readonly draft: string;
  readonly selectedModel: ModelId;
  readonly setDraft: (value: string) => void;
  readonly setSelectedModel: (model: ModelId) => void;
};

export const useChatStore = create<ChatStore>()((set) => ({
  draft: "",
  selectedModel: DEFAULT_MODEL_ID,
  setDraft: (draft) => set({ draft }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
}));
