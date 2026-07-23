import type { EveMessageInputRequest, InputResponse } from "eve/client";
import { Check } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InputRequestProps = {
  readonly request: EveMessageInputRequest;
} & (
  | {
      readonly disabled: boolean;
      readonly onSelect: (optionId: string) => void;
      readonly response?: never;
    }
  | {
      readonly disabled?: never;
      readonly onSelect?: never;
      readonly response: InputResponse;
    }
);

export function InputRequest({ disabled, onSelect, request, response }: InputRequestProps) {
  const titleId = useId();
  const options = request.options ?? [];
  const selectedOption = options.find((option) => option.id === response?.optionId);
  const answerText = selectedOption ? undefined : (response?.text ?? response?.optionId);

  return (
    <section
      aria-labelledby={titleId}
      className="my-4 rounded-xl border bg-card p-4 text-card-foreground"
    >
      <h2 className="font-medium leading-6" id={titleId}>
        {request.prompt}
      </h2>
      {options.length > 0 && (
        <div className="mt-3 flex w-full flex-wrap gap-2">
          {options.map((option) => {
            const isSelected = option.id === response?.optionId;
            if (response) {
              return (
                <span
                  className={cn(
                    "inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-sm",
                    isSelected
                      ? "border-foreground/30 bg-foreground text-background"
                      : "bg-background text-muted-foreground opacity-50",
                  )}
                  key={option.id}
                >
                  <span className="whitespace-normal text-left">{option.label}</span>
                  {isSelected && (
                    <>
                      <Check aria-hidden="true" />
                      <span className="sr-only">Selected answer</span>
                    </>
                  )}
                </span>
              );
            }

            return (
              <Button
                disabled={disabled}
                className="h-auto min-h-6 max-w-full whitespace-normal py-1 text-left"
                key={option.id}
                onClick={() => onSelect(option.id)}
                size="sm"
                variant={option.style === "primary" ? "default" : "outline"}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      )}
      {answerText && (
        <p className="mt-3 flex w-fit max-w-full items-start gap-1.5 rounded-md bg-foreground px-2 py-1 text-background text-sm">
          <span className="whitespace-pre-wrap">{answerText}</span>
          <Check aria-hidden="true" className="mt-px" />
        </p>
      )}
    </section>
  );
}
