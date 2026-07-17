import { defineChannel, POST } from "eve/channels";
import { localDev, routeAuth, vercelOidc } from "eve/channels/auth";
import { getRun } from "workflow/api";

const auth = [vercelOidc(), localDev()];

export default defineChannel({
  routes: [
    POST("/eve/v1/session/:sessionId/stop", async (request, { params }) => {
      const caller = await routeAuth(request, auth);
      if (caller instanceof Response) return caller;

      const sessionId = params.sessionId;
      if (!sessionId) return new Response("Missing session ID.", { status: 400 });

      const run = getRun(sessionId);
      if (["pending", "running"].includes(await run.status)) {
        await run.cancel({ cancelReason: "Stopped by user" });
      }
      return new Response(null, { status: 204 });
    }),
  ],
});
