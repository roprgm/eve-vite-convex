# eve-vite-convex

A minimal durable chat app using [eve](https://eve.dev), Convex, React Router, Vite, and TypeScript.

> [!WARNING]
> This is an unauthenticated demo. Anyone with access to its Convex deployment can read or modify
> every chat. Do not expose it publicly without adding authentication and per-user authorization.

## How persistence works

The eve persistence hook creates a Convex chat for each new session and stores every durable stream event under that session ID. This works the same whether a session starts in the browser or through another eve channel.

For a new browser chat, the UI renders the submitted message and live eve stream immediately. Once the session-backed Convex record is available, the URL becomes `/c/<chat-id>` and the persisted event log takes over without an intermediate loading state.

Convex keeps:

- runtime status and the eve continuation cursor;
- the complete event log needed to rehydrate eve's UI reducer.

After the initial turn, the browser renders the event log subscribed from Convex. That durable source keeps user messages, assistant messages, and `ask_question` requests synchronized across tabs.

Zustand holds transient client state such as per-chat drafts and open dialogs; Convex remains the source of truth for chats and events.

## Setup

Prerequisites: Bun, a Convex account, and a Vercel AI Gateway key.

1. Install dependencies:

   ```bash
   bun install
   ```

2. Configure and deploy the Convex development backend:

   ```bash
   bunx convex dev --once
   ```

   This creates `.env.local` with `VITE_CONVEX_URL`. The eve persistence hook reads the same URL server-side.

3. Create a long random secret. Put the same value in local eve configuration and the Convex deployment:

   ```bash
   # .env.local
   EVE_HOOK_SECRET=replace-with-a-long-random-value

   bunx convex env set EVE_HOOK_SECRET replace-with-a-long-random-value
   ```

4. Add the model credential to `.env.local`:

   ```bash
   AI_GATEWAY_API_KEY=your-ai-gateway-key
   ```

   See [.env.example](./.env.example) for the complete shape.

5. Start Convex, eve, and Vite together:

   ```bash
   bun run dev
   ```

   Open the Vite URL printed in the terminal, normally `http://localhost:5173`.

   Chat permalinks use `/c/<chat-id>`. Configure production static hosting to rewrite those paths to `app/index.html`.

## Commands

```bash
bun run dev          # Convex + eve + Vite
bun run build        # strict TypeScript check and production frontend build
bun run test         # focused pure-logic tests
```

The development command starts Convex, eve, and Vite together. Vite proxies `/eve/*` to the local eve server on port 4879. The `app/` directory contains the browser entry files so `index.html` stays away from the repository root, where eve could mistake it for a renderer template. Components, utilities, and styles live in their conventional top-level directories.

## Production security

Authentication is intentionally out of scope for this demo. A production app must protect the eve routes, authenticate Convex calls, and scope every stored chat and message to the authenticated user or tenant. The shared hook secret protects server-side writes; it is not a substitute for user authorization.
