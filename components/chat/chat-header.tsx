import { PanelLeft, SquarePen } from "lucide-react";
import { href, useNavigate, useOutletContext } from "react-router";

import { Button } from "@/components/ui/button";
import { useChatStore } from "@/lib/chat-store";

export function ChatHeader({ title }: { readonly title: string }) {
  const { openSidebar } = useOutletContext<{ readonly openSidebar: () => void }>();
  const navigate = useNavigate();
  const setDraft = useChatStore((state) => state.setDraft);

  function openNewChat(): void {
    setDraft("");
    void navigate(href("/"));
  }

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b px-3 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <Button
          aria-label="Open chats"
          className="md:hidden"
          onClick={openSidebar}
          size="icon-sm"
          variant="ghost"
        >
          <PanelLeft aria-hidden="true" />
        </Button>
        <h1 className="truncate font-medium">{title}</h1>
      </div>
      <Button className="md:hidden" onClick={openNewChat} size="sm" variant="ghost">
        <SquarePen aria-hidden="true" />
        New chat
      </Button>
    </header>
  );
}
