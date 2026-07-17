import { create } from "zustand";

import type { Id } from "@/convex/_generated/dataModel";

export const NEW_CHAT_DRAFT = "new";

type DeleteTarget = {
  readonly id: Id<"chats">;
  readonly title: string;
};

type ChatStore = {
  readonly deleteTarget?: DeleteTarget;
  readonly drafts: Record<string, string>;
  readonly isSidebarOpen: boolean;
  readonly closeDelete: () => void;
  readonly closeSidebar: () => void;
  readonly openDelete: (target: DeleteTarget) => void;
  readonly openSidebar: () => void;
  readonly setDraft: (key: string, value: string) => void;
};

export const useChatStore = create<ChatStore>()((set) => ({
  drafts: {},
  isSidebarOpen: false,
  closeDelete: () => set({ deleteTarget: undefined }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  openDelete: (deleteTarget) => set({ deleteTarget }),
  openSidebar: () => set({ isSidebarOpen: true }),
  setDraft: (key, value) => set(({ drafts }) => ({ drafts: { ...drafts, [key]: value } })),
}));
