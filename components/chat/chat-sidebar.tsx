import { usePaginatedQuery } from "convex/react";
import { AlignLeft, LoaderCircle, SquarePen, Trash2, X } from "lucide-react";
import { useState } from "react";
import { href, Link, useNavigate } from "react-router";

import { DeleteChatDialog, type DeleteTarget } from "@/components/chat/delete-chat-dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { NEW_CHAT_DRAFT, useChatStore } from "@/lib/chat-store";
import { cn } from "@/lib/cn";

function ChatRow({
  chat,
  isSelected,
  onDelete,
  onNavigate,
}: {
  readonly chat: Doc<"chats">;
  readonly isSelected: boolean;
  readonly onDelete: (chat: DeleteTarget) => void;
  readonly onNavigate: () => void;
}) {
  return (
    <div
      className={cn(
        "group mb-0.5 flex h-7 min-w-0 items-center rounded-md transition-colors hover:bg-sidebar-hover focus-within:bg-sidebar-hover",
        isSelected &&
          "bg-sidebar-selected hover:bg-sidebar-selected focus-within:bg-sidebar-selected",
      )}
    >
      <Link
        aria-current={isSelected ? "page" : undefined}
        className="flex h-full min-w-0 flex-1 items-center px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
        onClick={isSelected ? onNavigate : undefined}
        to={href("/c/:chatId", { chatId: chat._id })}
      >
        <span className="block truncate">{chat.title}</span>
      </Link>
      {chat.status === "running" ? (
        <LoaderCircle
          aria-label={`${chat.title} is working`}
          className="mr-2 animate-spin text-muted-foreground"
        />
      ) : (
        <Button
          aria-label={`Delete ${chat.title}`}
          className="mr-0.5 text-muted-foreground md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100"
          onClick={() => onDelete(chat)}
          size="icon-sm"
          variant="destructive-ghost"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

type ChatSidebarProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly selectedChatId: string | null;
};

export function ChatSidebar({ isOpen, onClose, selectedChatId }: ChatSidebarProps) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.chats.list,
    {},
    { initialNumItems: 50 },
  );
  const setDraft = useChatStore((state) => state.setDraft);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>();
  const navigate = useNavigate();

  function openDelete(target: DeleteTarget): void {
    setDeleteTarget(target);
    document.querySelector<HTMLDialogElement>("#delete-chat-dialog")?.showModal();
  }

  function openNewChat(): void {
    setDraft(NEW_CHAT_DRAFT, "");
    if (selectedChatId === null) onClose();
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
          {results.map((chat) => (
            <ChatRow
              chat={chat}
              isSelected={selectedChatId === chat._id}
              key={chat._id}
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
      <DeleteChatDialog onClose={() => setDeleteTarget(undefined)} target={deleteTarget} />
    </>
  );
}
