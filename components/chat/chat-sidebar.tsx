import { useConvexPaginatedQuery } from "@convex-dev/react-query";
import { AlignLeft, SquarePen, X } from "lucide-react";
import { useState } from "react";
import { href, useNavigate } from "react-router";

import { ChatSidebarItem, type ChatSummary } from "@/components/chat/chat-sidebar-item";
import { DeleteChatDialog } from "@/components/chat/delete-chat-dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useChatStore } from "@/lib/chat-store";
import { cn } from "@/lib/utils";

type ChatSidebarProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly selectedChatId: string | null;
};

export function ChatSidebar({ isOpen, onClose, selectedChatId }: ChatSidebarProps) {
  const {
    loadMore,
    results: chats,
    status,
  } = useConvexPaginatedQuery(api.chats.list, {}, { initialNumItems: 50 });
  const setDraft = useChatStore((state) => state.setDraft);
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<ChatSummary>();

  function openDelete(chat: ChatSummary): void {
    setDeleteTarget(chat);
    document.querySelector<HTMLDialogElement>("#delete-chat-dialog")?.showModal();
  }

  function chatDeleted(chatId: string): void {
    if (selectedChatId !== chatId) return;
    onClose();
    void navigate(href("/"));
  }

  function openNewChat(): void {
    setDraft("");
    onClose();
    void navigate("/");
  }

  return (
    <>
      {isOpen && (
        <button
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
          tabIndex={-1}
          type="button"
        />
      )}
      <aside
        className={cn(
          "invisible fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] -translate-x-full flex-col border-r bg-sidebar p-3 text-sidebar-foreground shadow-2xl transition md:visible md:static md:z-auto md:w-72 md:translate-x-0 md:p-2 md:shadow-none",
          isOpen && "visible translate-x-0",
        )}
      >
        <div className="flex h-10 items-center justify-between px-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <AlignLeft aria-hidden="true" className="text-muted-foreground" />
            <span className="truncate">Eve Chat</span>
          </div>
          <div className="flex">
            <Button
              aria-label="New chat"
              className="text-muted-foreground"
              onClick={openNewChat}
              size="icon-sm"
              variant="ghost"
            >
              <SquarePen aria-hidden="true" />
            </Button>
            <Button
              aria-label="Close chats"
              className="text-muted-foreground md:hidden"
              onClick={onClose}
              size="icon-sm"
              variant="ghost"
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        </div>
        <nav
          aria-label="Chats"
          className="app-scrollbar scroll-fade -mr-3 mt-4 min-h-0 flex-1 overflow-y-auto pr-3 [scrollbar-gutter:stable] md:-mr-2 md:pr-2"
        >
          <p className="px-2 pb-1.5 text-sm font-medium text-muted-foreground">Chats</p>
          {chats.map((chat) => (
            <ChatSidebarItem
              chat={chat}
              isSelected={selectedChatId === chat.chatId}
              key={chat.chatId}
              onDelete={openDelete}
              onNavigate={onClose}
            />
          ))}
          {status === "CanLoadMore" && (
            <Button className="mt-3 w-full" onClick={() => loadMore(50)} size="sm" variant="ghost">
              Load older chats
            </Button>
          )}
        </nav>
      </aside>
      <DeleteChatDialog
        onClose={() => setDeleteTarget(undefined)}
        onDeleted={chatDeleted}
        target={deleteTarget}
      />
    </>
  );
}
