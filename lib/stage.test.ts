import { describe, expect, it } from "vitest";
import { stageOneDisabledCapabilities } from "./stage";

describe("Stage 1 feature gates", () => {
  it("keeps side-effecting production capabilities disabled", () => {
    expect(stageOneDisabledCapabilities).toEqual([
      "authentication",
      "persistence",
      "document-upload",
      "ai-provider-calls",
      "email-sending",
      "payments",
    ]);
  });
});
