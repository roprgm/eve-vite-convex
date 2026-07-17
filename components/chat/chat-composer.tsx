import { ArrowUp, Square } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useEffect, useLayoutEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { useChatStore } from "@/lib/chat-store";

type ComposerButtonProps = {
  readonly disabled: boolean;
  readonly isStreaming: boolean;
  readonly onStop: () => void;
};

function ComposerButton({ disabled, isStreaming, onStop }: ComposerButtonProps) {
  if (isStreaming) {
    return (
      <Button
        aria-label="Stop generating"
        className="size-6 rounded-full"
        onClick={onStop}
        size="icon-sm"
      >
        <Square aria-hidden="true" className="size-3! fill-current" />
      </Button>
    );
  }

  return (
    <Button
      aria-label="Send message"
      className="size-6 rounded-full"
      disabled={disabled}
      size="icon-sm"
      type="submit"
    >
      <ArrowUp aria-hidden="true" />
    </Button>
  );
}

type ChatComposerProps = {
  readonly draftKey: string;
  readonly isBusy: boolean;
  readonly isStreaming: boolean;
  readonly needsOption: boolean;
  readonly onSend: (message: string) => Promise<boolean>;
  readonly onStop: () => void;
};

export function ChatComposer({
  draftKey,
  isBusy,
  isStreaming,
  needsOption,
  onSend,
  onStop,
}: ChatComposerProps) {
  const draft = useChatStore((state) => state.drafts[draftKey] ?? "");
  const setDraft = useChatStore((state) => state.setDraft);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wasBusyRef = useRef(false);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 192)}px`;
  });

  useEffect(() => {
    if (wasBusyRef.current && !isBusy && !needsOption) {
      textareaRef.current?.focus();
    }

    wasBusyRef.current = isBusy;
  }, [isBusy, needsOption]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const message = draft.trim();
    if (!message || isBusy || needsOption) return;

    setDraft(draftKey, "");
    const sent = await onSend(message);
    if (!sent) setDraft(draftKey, message);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  const placeholder = needsOption ? "Choose an option above" : "Message Eve";
  const sendDisabled = isBusy || needsOption || !draft.trim();

  return (
    <div className="shrink-0 bg-background px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6">
      <form
        className="mx-auto flex max-w-4xl items-end gap-2 rounded-xl border border-border/25 bg-muted py-2 pr-2 pl-4 transition-colors focus-within:border-ring/50"
        onSubmit={handleSubmit}
      >
        <label className="sr-only" htmlFor="message-input">
          Message Eve
        </label>
        <textarea
          autoComplete="off"
          className="max-h-48 min-h-8 flex-1 resize-none overflow-y-auto bg-transparent py-1 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          disabled={needsOption}
          id="message-input"
          onChange={(event) => setDraft(draftKey, event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          ref={textareaRef}
          rows={1}
          value={draft}
        />
        <ComposerButton disabled={sendDisabled} isStreaming={isStreaming} onStop={onStop} />
      </form>
      <p className="mx-auto mt-2 max-w-4xl text-center text-sm text-muted-foreground">
        Eve can make mistakes. Check important information.
      </p>
    </div>
  );
}
