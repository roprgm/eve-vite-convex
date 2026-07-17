import { MessageScroller as MessageScrollerPrimitive } from "@shadcn/react/message-scroller";
import { ArrowDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ComponentProps, PropsWithChildren } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

function MessageScroller({ children }: PropsWithChildren) {
  return (
    <MessageScrollerPrimitive.Provider autoScroll>
      <MessageScrollerPrimitive.Root className="relative min-h-0 flex-1 overflow-hidden">
        <MessageScrollerPrimitive.Viewport className="app-scrollbar scroll-fade size-full overflow-y-auto overscroll-contain scrollbar-gutter-stable">
          <MessageScrollerPrimitive.Content className="flex h-max min-h-full flex-col px-3 py-5 sm:px-6">
            {children}
          </MessageScrollerPrimitive.Content>
        </MessageScrollerPrimitive.Viewport>
        <MessageScrollerPrimitive.Button
          className="absolute bottom-3 left-1/2 z-10 size-8 -translate-x-1/2 rounded-full bg-background shadow-md transition-[opacity,scale] data-[active=false]:pointer-events-none data-[active=false]:scale-95 data-[active=false]:opacity-0"
          render={<Button size="icon-sm" variant="outline" />}
        >
          <ArrowDown aria-hidden="true" />
          <span className="sr-only">Jump to latest</span>
        </MessageScrollerPrimitive.Button>
      </MessageScrollerPrimitive.Root>
    </MessageScrollerPrimitive.Provider>
  );
}

const MotionMessageScrollerItem = motion.create(MessageScrollerItem);

function MessageScrollerAnimatedItem({
  children,
  messageId,
}: PropsWithChildren<{ readonly messageId: string }>) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <MotionMessageScrollerItem
      animate={{ opacity: 1, y: 0 }}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      messageId={messageId}
      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </MotionMessageScrollerItem>
  );
}

function MessageScrollerItem({
  className,
  ...props
}: ComponentProps<typeof MessageScrollerPrimitive.Item>) {
  return (
    <MessageScrollerPrimitive.Item
      className={cn("mx-auto w-full max-w-3xl min-w-0 shrink-0", className)}
      {...props}
    />
  );
}

export { MessageScroller, MessageScrollerAnimatedItem, MessageScrollerItem };
