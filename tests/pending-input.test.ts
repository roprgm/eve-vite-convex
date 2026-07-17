import { describe, expect, it } from "vitest";

import { isSessionLimitRequest } from "@/lib/pending-input";

describe("isSessionLimitRequest", () => {
  it("recognizes a token-limit request", () => {
    expect(
      isSessionLimitRequest({
        prompt:
          "The session used 4,238 of its 4,000 output-token budget. Continue with a fresh budget?",
        requestId: "session-1:limit:output:12345",
      }),
    ).toBe(true);
  });

  it("ignores ordinary input requests", () => {
    expect(
      isSessionLimitRequest({
        prompt: "Which option should I use?",
        requestId: "question-1",
      }),
    ).toBe(false);
  });
});
