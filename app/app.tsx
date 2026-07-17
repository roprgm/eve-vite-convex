import { Outlet, useMatch } from "react-router";

import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { DeleteChatDialog } from "@/components/chat/delete-chat-dialog";
import { useChatStore } from "@/lib/chat-store";
import { useMediaQuery } from "@/lib/use-media-query";

export function App() {
  const chatId = useMatch("/c/:chatId")?.params.chatId ?? null;
  const isSidebarOpen = useChatStore((state) => state.isSidebarOpen);
  const isMobile = useMediaQuery("(max-width: 767px)");

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <ChatSidebar selectedChatId={chatId} />
      <div className="flex min-w-0 flex-1" inert={isMobile && isSidebarOpen}>
        <Outlet />
      </div>
      <DeleteChatDialog />
    </div>
  );
}
