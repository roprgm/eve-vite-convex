import { useLayoutEffect, useRef, useState } from "react";
import { Outlet, useLocation, useMatch } from "react-router";

import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { useMediaQuery } from "@/lib/use-media-query";

export function App() {
  const chatId = useMatch("/c/:chatId")?.params.chatId ?? null;
  const locationKey = useLocation().key;
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const previousLocationKey = useRef(locationKey);

  useLayoutEffect(() => {
    if (previousLocationKey.current !== locationKey) setSidebarOpen(false);
    previousLocationKey.current = locationKey;
  }, [locationKey]);

  function closeSidebar(): void {
    setSidebarOpen(false);
  }

  function openSidebar(): void {
    setSidebarOpen(true);
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <ChatSidebar isOpen={isSidebarOpen} onClose={closeSidebar} selectedChatId={chatId} />
      <div className="flex min-w-0 flex-1" inert={isMobile && isSidebarOpen}>
        <Outlet context={{ openSidebar }} />
      </div>
    </div>
  );
}
