import { describe, expect, it } from "vitest";

import { toClientContinuationToken } from "@/lib/eve-session";

describe("toClientContinuationToken", () => {
  it("removes the duplicated runtime channel namespace", () => {
    expect(toClientContinuationToken("eve:eve:session")).toBe("eve:session");
  });

  it("preserves public and missing tokens", () => {
    expect(toClientContinuationToken("eve:session")).toBe("eve:session");
    expect(toClientContinuationToken("session")).toBe("session");
    expect(toClientContinuationToken(undefined)).toBeUndefined();
  });
});
