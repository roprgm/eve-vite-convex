import { type UIEvent, useLayoutEffect, useRef, useState } from "react";

export function useChatScroll() {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (isAtBottom) endRef.current?.scrollIntoView({ block: "end" });
  });

  function handleScroll(event: UIEvent<HTMLDivElement>): void {
    const scroller = event.currentTarget;
    setIsAtBottom(scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80);
  }

  function scrollToEnd(): void {
    setIsAtBottom(true);
    endRef.current?.scrollIntoView({ block: "end" });
  }

  return { endRef, handleScroll, isAtBottom, scrollToEnd };
}
