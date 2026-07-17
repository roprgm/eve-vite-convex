import { ArrowUp, Check, ChevronDown, Mic, Plus, Square } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { useChatStore } from "@/lib/chat-store";
import { MODEL_OPTIONS } from "@/lib/models";

function ModelSelector() {
  const selectedModelId = useChatStore((state) => state.selectedModel);
  const setSelectedModel = useChatStore((state) => state.setSelectedModel);
  const selectedModel = MODEL_OPTIONS.find((model) => model.value === selectedModelId);

  return (
    <div className="ml-auto">
      <Button
        className="h-8 gap-1 px-2 text-foreground [anchor-name:--model-selector]"
        popoverTarget="model-options"
        size="sm"
        variant="ghost"
      >
        {selectedModel?.label}
        <ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground" />
      </Button>
      <div
        className="m-0 mb-2 w-56 rounded-xl border border-border bg-card p-1 shadow-xl [position-anchor:--model-selector] [position-area:top_span-left]"
        id="model-options"
        popover="auto"
      >
        <div className="px-2 pt-1 pb-1.5 text-sm font-medium text-muted-foreground">Model</div>
        {MODEL_OPTIONS.map((model) => (
          <button
            aria-pressed={model.value === selectedModelId}
            className="mb-0.5 flex h-7 w-full cursor-pointer items-center rounded-md px-2 text-left outline-none transition-colors last:mb-0 hover:bg-sidebar-hover focus-visible:bg-sidebar-hover aria-pressed:bg-sidebar-selected aria-pressed:hover:bg-sidebar-selected"
            key={model.value}
            onClick={() => setSelectedModel(model.value)}
            popoverTarget="model-options"
            popoverTargetAction="hide"
            type="button"
          >
            {model.label}
            {model.value === selectedModelId && (
              <Check aria-hidden="true" className="ml-auto size-4" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

type ChatComposerProps = {
  readonly disabled?: boolean;
  readonly draftKey: string;
  readonly isGenerating: boolean;
  readonly needsOption: boolean;
  readonly onSend: (message: string) => Promise<boolean>;
  readonly onStop: () => void;
};

export function ChatComposer({
  disabled = false,
  draftKey,
  isGenerating,
  needsOption,
  onSend,
  onStop,
}: ChatComposerProps) {
  const draft = useChatStore((state) => state.drafts[draftKey] ?? "");
  const setDraft = useChatStore((state) => state.setDraft);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled && !isGenerating && !needsOption) textareaRef.current?.focus();
  }, [disabled, isGenerating, needsOption]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const message = draft.trim();
    if (!message || disabled || isGenerating || needsOption) return;

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
  const sendDisabled = disabled || isGenerating || needsOption || !draft.trim();

  return (
    <div className="shrink-0 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6">
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
          disabled={disabled || needsOption}
          id="message-input"
          onChange={(event) => setDraft(draftKey, event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          ref={textareaRef}
          rows={1}
          value={draft}
        />
        <div className="flex items-center gap-1 pt-1">
          <Button
            aria-label="Attach files (coming soon)"
            className="size-8 rounded-full"
            disabled
            size="icon-sm"
            variant="ghost"
          >
            <Plus aria-hidden="true" className="size-5" />
          </Button>
          <ModelSelector />
          <Button
            aria-label="Voice input (coming soon)"
            className="size-8 rounded-full"
            disabled
            size="icon-sm"
            variant="ghost"
          >
            <Mic aria-hidden="true" className="size-4" />
          </Button>
          {isGenerating ? (
            <Button
              aria-label="Stop generating"
              className="size-8 rounded-full"
              onClick={onStop}
              size="icon-sm"
            >
              <Square aria-hidden="true" className="fill-current" />
            </Button>
          ) : (
            <Button
              aria-label="Send message"
              className="size-8 rounded-full"
              disabled={sendDisabled}
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
