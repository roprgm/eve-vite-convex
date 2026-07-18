import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { href, Link } from "react-router";

import { ChatSidebarActions } from "@/components/chat/chat-sidebar-actions";
import type { ChatStatus } from "@/components/chat/use-chat-session";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

export type ChatSummary = {
  readonly chatId: string;
  readonly status: ChatStatus;
  readonly title: string;
};

export function ChatSidebarItem({
  chat,
  isSelected,
  onDelete,
  onNavigate,
}: {
  readonly chat: ChatSummary;
  readonly isSelected: boolean;
  readonly onDelete: (chat: ChatSummary) => void;
  readonly onNavigate: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setEditing] = useState(false);
  const renameChat = useMutation({
    mutationFn: useConvexMutation(api.chats.rename),
    onSuccess: () => setEditing(false),
  });

  useEffect(() => {
    if (!isEditing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditing]);

  function saveTitle(): void {
    const title = inputRef.current?.value.trim();
    if (!title || title === chat.title) {
      setEditing(false);
      return;
    }

    renameChat.mutate({ chatId: chat.chatId, title });
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    inputRef.current?.blur();
  }

  function cancel(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== "Escape") return;
    event.currentTarget.value = chat.title;
    event.currentTarget.blur();
  }

  return (
    <div
      className={cn(
        "group mb-0.5 flex h-7 min-w-0 items-center rounded-md transition-colors hover:bg-sidebar-hover focus-within:bg-sidebar-hover",
        isSelected &&
          "bg-sidebar-selected hover:bg-sidebar-selected focus-within:bg-sidebar-selected",
      )}
    >
      {isEditing && (
        <form className="min-w-0 flex-1 px-2" onSubmit={submit}>
          <input
            aria-invalid={renameChat.isError}
            aria-label={`Rename ${chat.title}`}
            className="w-full bg-transparent outline-none aria-invalid:text-destructive"
            defaultValue={chat.title}
            disabled={renameChat.isPending}
            maxLength={100}
            onBlur={saveTitle}
            onKeyDown={cancel}
            ref={inputRef}
          />
        </form>
      )}
      {!isEditing && (
        <Link
          aria-current={isSelected}
          className="flex h-full min-w-0 flex-1 items-center px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
          onClick={onNavigate}
          to={href("/c/:chatId", { chatId: chat.chatId })}
        >
          <span className="block truncate">{chat.title}</span>
        </Link>
      )}
      {!isEditing && (
        <ChatSidebarActions
          chatId={chat.chatId}
          onDelete={() => onDelete(chat)}
          onRename={() => {
            renameChat.reset();
            setEditing(true);
          }}
          status={chat.status}
          title={chat.title}
        />
      )}
    </div>
  );
}
