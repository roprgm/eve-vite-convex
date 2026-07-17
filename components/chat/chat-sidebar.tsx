import { useMutation, usePaginatedQuery } from "convex/react";
import {
  Archive,
  ArchiveRestore,
  CircleAlert,
  FolderOpen,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { href, Link, useNavigate } from "react-router";

import { ActionMenu, ActionMenuItem } from "@/components/ui/action-menu";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { NEW_CHAT_DRAFT, useChatStore } from "@/lib/chat-store";
import { cn } from "@/lib/cn";

type ChatAction = (id: Id<"chats">) => Promise<void>;

type ChatRowProps = {
  readonly chat: Doc<"chats">;
  readonly isArchived?: boolean;
  readonly isSelected: boolean;
  readonly onArchive: ChatAction;
  readonly onError: (message: string) => void;
  readonly onRestore: ChatAction;
};

function ChatRow({
  chat,
  isArchived = false,
  isSelected,
  onArchive,
  onError,
  onRestore,
}: ChatRowProps) {
  const closeSidebar = useChatStore((state) => state.closeSidebar);
  const openDelete = useChatStore((state) => state.openDelete);
  const [isPending, setIsPending] = useState(false);
  const archiveAction = isArchived ? onRestore : onArchive;
  const ArchiveActionIcon = isArchived ? ArchiveRestore : Archive;
  const archiveActionLabel = isArchived ? "Restore" : "Archive";

  async function runArchiveAction(): Promise<void> {
    setIsPending(true);
    try {
      await archiveAction(chat._id);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not update chat.");
    } finally {
      setIsPending(false);
    }
  }

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
        onClick={closeSidebar}
        to={href("/c/:chatId", { chatId: chat._id })}
      >
        <span className="block truncate">{chat.title}</span>
      </Link>

      <ActionMenu
        className="mr-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        label={`Actions for ${chat.title}`}
      >
        <ActionMenuItem disabled={isPending} onClick={() => void runArchiveAction()}>
          <ArchiveActionIcon aria-hidden="true" />
          {archiveActionLabel}
        </ActionMenuItem>
        <ActionMenuItem
          disabled={isPending || chat.status === "running"}
          onClick={() => openDelete({ id: chat._id, title: chat.title })}
          variant="destructive"
        >
          <Trash2 aria-hidden="true" />
          Delete
        </ActionMenuItem>
      </ActionMenu>
    </div>
  );
}

function SidebarAlert({
  message,
  onDismiss,
}: {
  readonly message?: string;
  readonly onDismiss: () => void;
}) {
  if (!message) return null;

  return (
    <Alert className="mt-2 flex items-start gap-2" variant="destructive">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0 flex-1">{message}</span>
      <Button
        aria-label="Dismiss error"
        className="-my-1 -mr-1 text-destructive/70"
        onClick={onDismiss}
        size="icon-sm"
        variant="destructive-ghost"
      >
        <X aria-hidden="true" />
      </Button>
    </Alert>
  );
}

function ChatListSkeleton() {
  return (
    <div aria-label="Loading chats" role="status">
      <Skeleton className="mb-0.5 h-7 w-full" />
      <Skeleton className="mb-0.5 h-7 w-5/6" />
      <Skeleton className="mb-0.5 h-7 w-11/12" />
      <Skeleton className="mb-0.5 h-7 w-3/4" />
    </div>
  );
}

export function ChatSidebar({ selectedChatId }: { readonly selectedChatId: string | null }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.chats.list,
    {},
    { initialNumItems: 50 },
  );
  const archiveChat = useMutation(api.chats.archive);
  const restoreChat = useMutation(api.chats.restore);
  const isSidebarOpen = useChatStore((state) => state.isSidebarOpen);
  const closeSidebar = useChatStore((state) => state.closeSidebar);
  const setDraft = useChatStore((state) => state.setDraft);
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string>();
  const chats = results.filter((chat) => chat.archivedAt === undefined);
  const archivedChats = results.filter((chat) => chat.archivedAt !== undefined);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isSidebarOpen && !dialog?.open) dialog?.showModal();
    if (!isSidebarOpen && dialog?.open) dialog.close();
  }, [isSidebarOpen]);

  function openNewChat(): void {
    closeSidebar();
    setDraft(NEW_CHAT_DRAFT, "");
    void navigate("/");
  }

  async function archive(id: Id<"chats">): Promise<void> {
    await archiveChat({ id });
    if (id === selectedChatId) openNewChat();
  }

  async function restore(id: Id<"chats">): Promise<void> {
    await restoreChat({ id });
  }

  function renderPanel(isMobile = false) {
    return (
      <>
        <div className="flex h-10 items-center justify-between px-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <FolderOpen aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">eve-vite-convex</span>
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
            {isMobile && (
              <Button
                aria-label="Close chats"
                autoFocus
                className="text-muted-foreground"
                onClick={closeSidebar}
                size="icon-sm"
                variant="ghost"
              >
                <X aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>

        <SidebarAlert message={error} onDismiss={() => setError(undefined)} />

        <nav
          aria-label="Chats"
          className="mt-4 min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]"
        >
          <p className="px-2 pb-1.5 text-sm font-medium text-muted-foreground">Chats</p>
          {status === "LoadingFirstPage" && <ChatListSkeleton />}
          {chats.map((chat) => (
            <ChatRow
              chat={chat}
              isSelected={selectedChatId === chat._id}
              key={chat._id}
              onArchive={archive}
              onError={setError}
              onRestore={restore}
            />
          ))}

          {archivedChats.length > 0 && (
            <details className="mt-5">
              <summary className="cursor-pointer px-2 pb-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                Archived ({archivedChats.length})
              </summary>
              {archivedChats.map((chat) => (
                <ChatRow
                  chat={chat}
                  isArchived
                  isSelected={selectedChatId === chat._id}
                  key={chat._id}
                  onArchive={archive}
                  onError={setError}
                  onRestore={restore}
                />
              ))}
            </details>
          )}

          {status === "CanLoadMore" && (
            <Button className="mt-3 w-full" onClick={() => loadMore(50)} size="sm" variant="ghost">
              Load older chats
            </Button>
          )}
        </nav>
      </>
    );
  }

  return (
    <>
      <aside className="hidden min-h-0 w-72 shrink-0 flex-col border-r bg-sidebar p-2 text-sidebar-foreground md:flex">
        {renderPanel()}
      </aside>
      <dialog
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-black/60 md:hidden"
        onClose={closeSidebar}
        ref={dialogRef}
      >
        <aside
          aria-label="Chat navigation"
          className="relative flex h-full w-[min(18rem,85vw)] flex-col border-r bg-sidebar p-3 text-sidebar-foreground shadow-2xl"
        >
          {renderPanel(true)}
        </aside>
      </dialog>
    </>
  );
}
