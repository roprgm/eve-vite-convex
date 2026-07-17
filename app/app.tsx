import { Outlet, useMatch } from "react-router";

import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { DeleteChatDialog } from "@/components/chat/delete-chat-dialog";

export function App() {
  const chatId = useMatch("/c/:chatId")?.params.chatId ?? null;

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <ChatSidebar selectedChatId={chatId} />
      <Outlet />
      <DeleteChatDialog />
    </div>
  );
}
