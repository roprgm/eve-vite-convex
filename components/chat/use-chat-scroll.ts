import { type UIEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const EDGE_THRESHOLD = 16;

export function useChatScroll() {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isAutoScrollingRef = useRef(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const shouldFollowRef = useRef(true);

  const updatePosition = useCallback((viewport: HTMLDivElement): void => {
    const nextIsAtBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= EDGE_THRESHOLD;

    if (!isAutoScrollingRef.current || nextIsAtBottom) {
      shouldFollowRef.current = nextIsAtBottom;
      isAutoScrollingRef.current = false;
    }
    setIsAtBottom(nextIsAtBottom);
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    if (shouldFollowRef.current) viewport.scrollTop = viewport.scrollHeight;
    updatePosition(viewport);
  });

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = viewport?.firstElementChild;
    if (!viewport || !content) return;

    const observer = new ResizeObserver(() => {
      if (shouldFollowRef.current) viewport.scrollTop = viewport.scrollHeight;
      updatePosition(viewport);
    });

    observer.observe(viewport);
    observer.observe(content);
    return () => observer.disconnect();
  }, [updatePosition]);

  function handleScroll(event: UIEvent<HTMLDivElement>): void {
    updatePosition(event.currentTarget);
  }

  function scrollToEnd(): void {
    const viewport = viewportRef.current;
    if (!viewport) return;

    shouldFollowRef.current = true;
    isAutoScrollingRef.current = true;
    viewport.scrollTo({ behavior: "smooth", top: viewport.scrollHeight });
  }

  return { handleScroll, isAtBottom, scrollToEnd, viewportRef };
}
