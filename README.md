# eve-vite-convex

A minimal durable chat built with [eve](https://eve.dev), Convex, React Router, Vite, and TypeScript.

> [!WARNING]
> This demo has no authentication. Anyone who can reach it can read or modify every chat.
> Add authentication and authorization before deploying it publicly.

## Architecture

`/` is a new chat. On first submit the browser creates a short public ID, renders the message
optimistically, creates the Convex chat, and navigates to `/c/<chatId>` immediately. Eve starts after
the chat exists. URLs never expose Convex document IDs, and unknown chat IDs are Not Found.

Eve owns the live turn; Convex stores chat metadata and completed turn checkpoints. The backend Eve
hook marks a turn running, then replays Eve's durable stream at its terminal boundary and atomically
stores one compact checkpoint and cursor. It never writes token deltas or relies on the browser to
finalize persistence.

Every open window follows a running chat from its saved cursor. A finished chat renders from Convex
only. Stop aborts the local stream and cancels the Eve turn.

> Eve does not currently dispatch authored hooks for workflow-level fatal failures, so this demo
> cannot persist that boundary without upstream support.

## Setup

```bash
bun install
bunx convex dev --once
```

Set the same long random `EVE_HOOK_SECRET` in `.env.local` and Convex, then add
`AI_GATEWAY_API_KEY` to `.env.local` (see [.env.example](./.env.example)).

`EVE_HOOK_SECRET` authenticates calls from the Eve hook to public Convex functions. It is sent only
between the two backends and is never stored in `chats` or `turns`.

```bash
bunx convex env set EVE_HOOK_SECRET your-secret
bun run dev
```

For Vercel previews, configure `EVE_HOOK_SECRET` as a Convex preview default. The build then wires
each Vercel preview to its matching Convex deployment automatically.

Vite proxies `/eve/*` to eve on port 4879. Production hosting must rewrite `/c/*` to `app/index.html`.
