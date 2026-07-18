import { Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MenuContent, MenuItem } from "@/components/ui/menu";
import { cn } from "@/lib/utils";

type SelectOption<T extends string> = {
  readonly label: string;
  readonly value: T;
};

type SelectProps<T extends string> = {
  readonly className?: string;
  readonly id: string;
  readonly label: string;
  readonly onValueChange: (value: T) => void;
  readonly options: readonly SelectOption<T>[];
  readonly value: T;
};

export function Select<T extends string>({
  className,
  id,
  label,
  onValueChange,
  options,
  value,
}: SelectProps<T>) {
  return (
    <div className={cn("relative", className)}>
      <Button
        className="h-8 gap-1 px-2 text-muted-foreground hover:bg-transparent hover:text-foreground focus-visible:text-foreground [anchor-name:--select]"
        popoverTarget={id}
        size="sm"
        variant="ghost"
      >
        {options.find((option) => option.value === value)?.label}
        <ChevronDown aria-hidden="true" className="size-3.5" />
      </Button>
      <MenuContent
        className="mb-2 w-56 [position-anchor:--select] [position-area:top_span-left] [position-try-fallbacks:flip-block]"
        id={id}
        popover="auto"
        side="top"
      >
        <div className="px-2 py-1 text-sm font-medium text-muted-foreground">{label}</div>
        {options.map((option) => (
          <MenuItem
            aria-pressed={option.value === value}
            className="aria-pressed:bg-sidebar-selected aria-pressed:hover:bg-sidebar-selected"
            key={option.value}
            onClick={() => onValueChange(option.value)}
            popoverTarget={id}
            popoverTargetAction="hide"
          >
            {option.label}
            {option.value === value && <Check aria-hidden="true" className="ml-auto size-4" />}
          </MenuItem>
        ))}
      </MenuContent>
    </div>
  );
}
