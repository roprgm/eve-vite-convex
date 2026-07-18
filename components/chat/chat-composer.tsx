import { ArrowUp, Square } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useChatStore } from "@/lib/chat-store";
import { MODEL_OPTIONS } from "@/lib/models";

function ModelSelector() {
  const selectedModelId = useChatStore((state) => state.selectedModel);
  const setSelectedModel = useChatStore((state) => state.setSelectedModel);

  return (
    <Select
      className="ml-auto"
      id="model-options"
      label="Model"
      onValueChange={setSelectedModel}
      options={MODEL_OPTIONS}
      value={selectedModelId}
    />
  );
}

type ChatComposerProps = {
  readonly disabled?: boolean;
  readonly isGenerating?: boolean;
  readonly onSend: (message: string) => void;
  readonly onStop?: () => void;
};

export function ChatComposer({
  disabled = false,
  isGenerating = false,
  onSend,
  onStop,
}: ChatComposerProps) {
  const draft = useChatStore((state) => state.draft);
  const setDraft = useChatStore((state) => state.setDraft);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const message = draft.trim();
    if (!message) return;

    setDraft("");
    onSend(message);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <div className="shrink-0 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6">
      <form
        className="mx-auto max-w-3xl rounded-2xl border border-border/40 bg-muted p-2 transition-colors focus-within:border-ring/50"
        onSubmit={handleSubmit}
      >
        <label className="sr-only" htmlFor="message-input">
          Message Eve
        </label>
        <textarea
          autoComplete="off"
          className="max-h-48 min-h-16 w-full resize-none overflow-y-auto bg-transparent px-2 py-1 outline-none [field-sizing:content] placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          id="message-input"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Eve"
          ref={textareaRef}
          rows={1}
          value={draft}
        />
        <div className="flex items-center gap-1 pt-1">
          <ModelSelector />
          {isGenerating && onStop && (
            <Button
              aria-label="Stop generating"
              className="size-8 rounded-full"
              onClick={onStop}
              size="icon-sm"
            >
              <Square aria-hidden="true" className="fill-current" />
            </Button>
          )}
          {!isGenerating && (
            <Button
              aria-label="Send message"
              className="size-8 rounded-full"
              disabled={disabled || !draft.trim()}
              size="icon-sm"
              type="submit"
            >
              <ArrowUp aria-hidden="true" />
            </Button>
          )}
        </div>
      </form>
      <p className="mx-auto mt-2 max-w-3xl text-center text-sm text-muted-foreground">
        Eve can make mistakes. Check important information.
      </p>
    </div>
  );
}
