import type { EveMessageInputRequest } from "eve/client";

import { Button } from "@/components/ui/button";

type InputRequestProps = {
  readonly disabled: boolean;
  readonly onSelect: (optionId: string) => void;
  readonly request: EveMessageInputRequest;
};

function getOptionVariant(style: string | undefined): "default" | "outline" {
  if (style === "primary") return "default";
  return "outline";
}

export function InputRequest({ disabled, onSelect, request }: InputRequestProps) {
  const options = request.options ?? [];

  return (
    <fieldset className="my-4 rounded-lg bg-card p-4 text-card-foreground">
      <legend>{request.prompt}</legend>
      {options.length > 0 && (
        <div className="mt-3 flex w-full flex-wrap gap-2">
          {options.map((option) => (
            <Button
              disabled={disabled}
              key={option.id}
              onClick={() => onSelect(option.id)}
              size="sm"
              variant={getOptionVariant(option.style)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </fieldset>
  );
}
