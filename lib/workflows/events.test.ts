import { describe, expect, it } from "vitest";
import { assertWorkflowEvent } from "./events";

describe("workflow event contracts", () => {
  it("accepts a valid documents.uploaded event", () => {
    const event = assertWorkflowEvent({
      name: "documents.uploaded",
      data: {
        caseId: "case-1",
        userId: "user-1",
        documentIds: ["doc-1"],
        occurredAt: new Date().toISOString(),
      },
    });
    expect(event.name).toBe("documents.uploaded");
  });

  it("rejects incomplete events", () => {
    expect(() =>
      assertWorkflowEvent({
        name: "case.created",
        data: { caseId: "", userId: "user-1", occurredAt: new Date().toISOString() },
      }),
    ).toThrow(/require case, user/);

    expect(() =>
      assertWorkflowEvent({
        name: "documents.uploaded",
        data: { caseId: "case-1", userId: "user-1", documentIds: [], occurredAt: new Date().toISOString() },
      }),
    ).toThrow(/at least one document/);
  });
});
