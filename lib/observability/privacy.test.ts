import { describe, expect, it } from "vitest";
import { createSafeErrorEvent, createSafeProductEvent, sanitizeProductProperties } from "./privacy";

describe("privacy-safe observability", () => {
  it("drops messages, identifiers, and arbitrary properties from error events", () => {
    const event = createSafeErrorEvent(new Error("receipt email owner@example.com"), {
      surface: "route_error",
      route: "/cases/secret-case-id",
      code: "route_render_failed",
    });

    expect(event).toEqual({ kind: "error", errorType: "Error", surface: "route_error", route: "unknown", code: "route_render_failed" });
    expect(JSON.stringify(event)).not.toContain("owner@example.com");
    expect(JSON.stringify(event)).not.toContain("secret-case-id");
  });

  it("allows only bounded, non-content product properties", () => {
    expect(sanitizeProductProperties({
      status: "approved",
      success: true,
      count: 2,
      message: "private customer text",
      caseId: "case-1",
      huge: 1_000_001,
    })).toEqual({ status: "approved", success: true, count: 2 });
  });

  it("creates only allowlisted product events", () => {
    expect(createSafeProductEvent("draft_approved", { stage: "review", count: 1 })).toEqual({
      kind: "product_event",
      name: "draft_approved",
      properties: { stage: "review", count: 1 },
    });
  });
});
