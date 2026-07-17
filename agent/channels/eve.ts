import { localDev, none, vercelOidc } from "eve/channels/auth";
import { defaultEveAuth, eveChannel } from "eve/channels/eve";

import { isModelId, MODEL_HEADER } from "@/lib/models";

export default eveChannel({
  auth: [vercelOidc(), localDev(), none()],
  onMessage(ctx) {
    const auth = defaultEveAuth(ctx);
    const model = ctx.eve.request.headers.get(MODEL_HEADER);

    if (!auth || !isModelId(model)) return { auth };

    return {
      auth: {
        ...auth,
        attributes: { ...auth.attributes, model },
      },
    };
  },
});
