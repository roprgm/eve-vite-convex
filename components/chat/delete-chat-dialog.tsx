import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";

import type { ChatSummary } from "@/components/chat/chat-sidebar-item";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { clearChatRuntime } from "@/lib/chat-runtime";

type DeleteChatDialogProps = {
  readonly onClose: () => void;
  readonly onDeleted: (chatId: string) => void;
  readonly target?: ChatSummary;
};

export function DeleteChatDialog({ onClose, onDeleted, target }: DeleteChatDialogProps) {
  const removeChat = useMutation({ mutationFn: useConvexMutation(api.chats.remove) });

  function remove(): void {
    if (!target) return;
    removeChat.mutate(
      { chatId: target.chatId },
      {
        onSuccess: () => {
          clearChatRuntime(target.chatId);
          onDeleted(target.chatId);
          document.querySelector<HTMLDialogElement>("#delete-chat-dialog")?.close();
        },
      },
    );
  }

  return (
    <dialog
      aria-describedby="delete-chat-description"
      aria-labelledby="delete-chat-title"
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-xl border bg-card p-5 text-card-foreground shadow-2xl backdrop:bg-black/70"
      id="delete-chat-dialog"
      onCancel={(event) => removeChat.isPending && event.preventDefault()}
      onClose={() => {
        removeChat.reset();
        onClose();
      }}
    >
      <h2 className="font-medium" id="delete-chat-title">
        Delete chat permanently?
      </h2>
      <p className="mt-2 text-muted-foreground" id="delete-chat-description">
        “{target?.title}” and its messages cannot be recovered.
      </p>
      {removeChat.isError && (
        <Alert className="mt-4" variant="destructive">
          Could not delete this chat.
        </Alert>
      )}
      <form className="mt-5 flex justify-end gap-2" method="dialog">
        <Button disabled={removeChat.isPending} type="submit" variant="outline">
          Cancel
        </Button>
        <Button disabled={removeChat.isPending} onClick={remove} variant="destructive">
          Delete
        </Button>
      </form>
    </dialog>
  );
}
