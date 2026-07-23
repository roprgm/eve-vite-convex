# Eve + Vite + Convex

A minimal durable chat built with [Eve](https://eve.dev/), Vite and Convex.

Includes a ready-to-use chat interface, durable conversation history and real-time synchronization
across clients. Use it as a starting point for Eve apps that need chats to survive refreshes,
disconnects and multiple open windows.

> Authentication is intentionally out of scope. Public deployments share chat history between
> visitors.

## Features

- 💬 **Minimal chat interface** — Messages, Markdown, reasoning and input requests.
- 💾 **Durable conversations** — Finished turns are persisted server-side in Convex, even if the
  client disconnects.
- 🔄 **Real-time sync** — Open the same chat in multiple windows and watch every update as it
  happens.
- ⚡ **Live responses** — In-progress turns render directly from Eve without waiting for
  persistence.
- 🗂️ **Conversation history** — Create, rename, continue and delete multiple chats.

## How it works

The chat interface connects to an Eve channel, which runs the agent and streams responses to the
browser. Convex stores completed turns and chat metadata, including editable titles, and keeps
every open client synchronized.

An Eve hook saves finished turns directly to Convex. While a response is in progress, clients
follow Eve's live stream; once it finishes, the same turn becomes part of the durable Convex
history. Because the hook runs on the backend, the browser does not need to stay connected.

## Run locally

Install the dependencies and configure a Convex development deployment:

```bash
bun install
bunx convex dev --once
```

`VITE_CONVEX_URL` is created automatically by Convex.

Choose how Eve accesses the model. Link the project to Vercel to use OIDC:

```bash
bunx eve link
```

Or add a Vercel AI Gateway key to `.env.local`:

```dotenv
AI_GATEWAY_API_KEY=your-ai-gateway-key
```

Finally, set the same persistence secret in `.env.local` and Convex:

```dotenv
EVE_HOOK_SECRET=your-secret
```

```bash
bunx convex env set EVE_HOOK_SECRET your-secret
```

Start the app:

```bash
bun run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Contributing

Contributions are welcome. Keep changes small, focused and easy to understand.
