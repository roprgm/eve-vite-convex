import { useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { useMatch, useNavigate } from "react-router";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useChatStore } from "@/lib/chat-store";

export function DeleteChatDialog() {
  const target = useChatStore((state) => state.deleteTarget);
  const closeDelete = useChatStore((state) => state.closeDelete);
  const removeChat = useMutation(api.chats.remove);
  const selectedChatId = useMatch("/c/:chatId")?.params.chatId;
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string>();
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (target && !dialog?.open) {
      setError(undefined);
      dialog?.showModal();
    }
    if (!target && dialog?.open) dialog.close();
  }, [target]);

  async function confirmDelete(): Promise<void> {
    if (!target) return;
    setError(undefined);
    setIsPending(true);

    try {
      await removeChat({ id: target.id });
      if (target.id === selectedChatId) void navigate("/");
      closeDelete();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not delete chat.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <dialog
      aria-labelledby="delete-chat-title"
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-xl border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/70"
      onCancel={(event) => isPending && event.preventDefault()}
      onClose={closeDelete}
      ref={dialogRef}
    >
      <div className="p-5">
        <h2 className="font-medium" id="delete-chat-title">
          Delete chat permanently?
        </h2>
        <p className="mt-2 text-muted-foreground">
          “{target?.title}” and its messages cannot be recovered.
        </p>
        {error && (
          <Alert className="mt-4" variant="destructive">
            {error}
          </Alert>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button autoFocus disabled={isPending} onClick={closeDelete} variant="outline">
            Cancel
          </Button>
          <Button disabled={isPending} onClick={() => void confirmDelete()} variant="destructive">
            Delete
          </Button>
        </div>
      </div>
    </dialog>
  );
}
