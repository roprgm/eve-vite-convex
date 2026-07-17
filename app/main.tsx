import { ConvexProvider, ConvexReactClient } from "convex/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";

import "./globals.css";
import { router } from "./router";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found.");

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL is not set");
}

const convexClient = new ConvexReactClient(convexUrl);

createRoot(root).render(
  <StrictMode>
    <ConvexProvider client={convexClient}>
      <RouterProvider router={router} />
    </ConvexProvider>
  </StrictMode>,
);
