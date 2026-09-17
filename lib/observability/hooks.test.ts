import { describe, expect, it, vi } from "vitest";
import { createObservabilityHooks, disabledObservabilityHooks } from "./hooks";

describe("observability provider hooks", () => {
  it("is inert by default", () => {
    expect(() => disabledObservabilityHooks.captureError({ kind: "error", errorType: "Error", surface: "route_error", route: "unknown" })).not.toThrow();
    expect(() => disabledObservabilityHooks.track({ kind: "product_event", name: "case_viewed", properties: {} })).not.toThrow();
  });

  it("accepts explicit provider adapters without exposing raw payload construction", () => {
    const captureError = vi.fn();
    const track = vi.fn();
    const hooks = createObservabilityHooks({ captureError, track });
    const error = { kind: "error" as const, errorType: "Error" as const, surface: "global_error" as const, route: "unknown" as const };
    const event = { kind: "product_event" as const, name: "case_viewed" as const, properties: {} };

    hooks.captureError(error);
    hooks.track(event);

    expect(captureError).toHaveBeenCalledWith(error);
    expect(track).toHaveBeenCalledWith(event);
  });
});
