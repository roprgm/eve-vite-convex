import { EllipsisVertical } from "lucide-react";
import {
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type PropsWithChildren,
  useId,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type ActionMenuProps = PropsWithChildren<{
  readonly className?: string;
  readonly label: string;
}>;

export function ActionMenu({ children, className, label }: ActionMenuProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  function toggleMenu(): void {
    const menu = menuRef.current;
    const trigger = rootRef.current?.querySelector("button");
    if (!menu || !trigger) return;

    if (menu.matches(":popover-open")) {
      menu.hidePopover();
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const openAbove = window.innerHeight - rect.bottom < 96;
    menu.style.left = `${Math.max(8, rect.right - 160)}px`;
    menu.style.top = openAbove ? "auto" : `${rect.bottom + 4}px`;
    menu.style.bottom = openAbove ? `${window.innerHeight - rect.top + 4}px` : "auto";
    menu.showPopover();
  }

  function handleToggle(): void {
    const isOpen = menuRef.current?.matches(":popover-open") ?? false;
    setOpen(isOpen);
    if (isOpen) menuRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    event.preventDefault();
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not(:disabled)"),
    );
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    const offset = event.key === "ArrowDown" ? 1 : -1;
    items.at((currentIndex + offset + items.length) % items.length)?.focus();
  }

  return (
    <div className={cn("flex shrink-0", className)} ref={rootRef}>
      <Button
        aria-controls={id}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className="text-muted-foreground"
        onClick={toggleMenu}
        size="icon-sm"
        variant="ghost"
      >
        <EllipsisVertical aria-hidden="true" />
      </Button>
      <div
        className="fixed inset-auto z-50 m-0 w-40 rounded-md border bg-card p-0.5 text-card-foreground shadow-lg"
        id={id}
        onKeyDown={handleKeyDown}
        onToggle={handleToggle}
        popover="auto"
        ref={menuRef}
        role="menu"
      >
        {children}
      </div>
    </div>
  );
}

type ActionMenuItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant?: "default" | "destructive";
};

export function ActionMenuItem({
  children,
  className,
  onClick,
  variant = "default",
  ...props
}: ActionMenuItemProps) {
  function handleClick(event: React.MouseEvent<HTMLButtonElement>): void {
    event.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover();
    onClick?.(event);
  }

  return (
    <button
      className={cn(
        "flex h-8 w-full cursor-pointer items-center gap-2 rounded-sm px-2 text-left outline-none hover:bg-accent focus-visible:bg-accent disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        variant === "destructive" && "text-destructive hover:bg-destructive/10",
        className,
      )}
      onClick={handleClick}
      role="menuitem"
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
