import { ForbiddenError, localDev, none, vercelOidc } from "eve/channels/auth";
import { defaultEveAuth, eveChannel } from "eve/channels/eve";
import {
  CHAT_ID_ATTRIBUTE,
  CHAT_ID_HEADER,
  EVE_ORIGIN_ATTRIBUTE,
  isPublicChatId,
} from "@/lib/chat-identity";
import { isModelId, MODEL_HEADER } from "@/lib/models";

export default eveChannel({
  auth: [vercelOidc(), localDev(), none()],
  onMessage(ctx) {
    const auth = defaultEveAuth(ctx);
    if (!auth) return { auth };

    const chatId = ctx.eve.request.headers.get(CHAT_ID_HEADER);
    if (chatId === null) return { auth };
    if (!isPublicChatId(chatId)) {
      throw new ForbiddenError({
        code: "invalid_chat_id",
        message: "The chat id header is invalid.",
      });
    }

    const attributes: Record<string, string | readonly string[]> = {
      ...auth.attributes,
      [CHAT_ID_ATTRIBUTE]: chatId,
      [EVE_ORIGIN_ATTRIBUTE]: new URL(ctx.eve.request.url).origin,
    };
    const model = ctx.eve.request.headers.get(MODEL_HEADER);
    if (isModelId(model)) attributes.model = model;

    return { auth: { ...auth, attributes } };
  },
});
