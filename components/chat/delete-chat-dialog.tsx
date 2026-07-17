import { useMutation } from "convex/react";
import { type MouseEvent, useState } from "react";
import { useMatch, useNavigate } from "react-router";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";

export type DeleteTarget = Pick<Doc<"chats">, "_id" | "title">;

type DeleteChatDialogProps = {
  readonly onClose: () => void;
  readonly target?: DeleteTarget;
};

export function DeleteChatDialog({ onClose, target }: DeleteChatDialogProps) {
  const removeChat = useMutation(api.chats.remove);
  const selectedChatId = useMatch("/c/:chatId")?.params.chatId;
  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  const [isPending, setIsPending] = useState(false);

  async function confirmDelete(event: MouseEvent<HTMLButtonElement>): Promise<void> {
    if (!target) return;
    const dialog = event.currentTarget.closest("dialog");
    setError(undefined);
    setIsPending(true);

    try {
      await removeChat({ id: target._id });
      if (target._id === selectedChatId) void navigate("/");
      dialog?.close();
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
      id="delete-chat-dialog"
      onCancel={(event) => isPending && event.preventDefault()}
      onClose={() => {
        setError(undefined);
        onClose();
      }}
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
        <form className="mt-5 flex justify-end gap-2" method="dialog">
          <Button autoFocus disabled={isPending} type="submit" variant="outline">
            Cancel
          </Button>
          <Button disabled={isPending} onClick={confirmDelete} variant="destructive">
            Delete
          </Button>
        </form>
      </div>
    </dialog>
  );
}
