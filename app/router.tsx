import { createBrowserRouter } from "react-router";

import { App } from "./app";
import { ChatPage } from "./chat-page";
import { AppErrorBoundary } from "./error-boundary";
import { HomePage } from "./home-page";
import { NotFoundPage } from "./not-found";

export const router = createBrowserRouter([
  {
    Component: App,
    ErrorBoundary: AppErrorBoundary,
    children: [
      { index: true, Component: HomePage },
      { path: "/c/:chatId", Component: ChatPage },
      { path: "*", Component: NotFoundPage },
    ],
    path: "/",
  },
]);
