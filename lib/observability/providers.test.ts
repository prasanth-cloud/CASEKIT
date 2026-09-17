import { describe, expect, it } from "vitest";
import { buildPostHogRequest, buildSentryRequest, forwardObservabilityEvent } from "./providers";

const now = new Date("2026-09-17T15:00:00.000Z");

describe("observability provider bridge", () => {
  it("builds a Sentry envelope from fixed, content-free fields", () => {
    const request = buildSentryRequest(
      {
        kind: "error",
        errorType: "Error",
        surface: "route_error",
        route: "cases",
        code: "route_render_failed",
      },
      "https://public:secret@o123.ingest.sentry.io/123",
      now,
      "0123456789abcdef0123456789abcdef",
    );

    expect(request?.url).toBe("https://o123.ingest.sentry.io/api/123/envelope/?sentry_version=7&sentry_key=public");
    expect(request?.headers).toEqual({ "content-type": "application/x-sentry-envelope" });
    expect(request?.body).toContain("CaseKit sanitized client error");
    expect(request?.body).toContain("route_render_failed");
    expect(request?.body).not.toContain("secret");
    expect(request?.body).not.toContain("stack");

    const [, itemHeader, itemBody] = request!.body.split("\n");
    expect(JSON.parse(itemHeader)).toEqual({ type: "event", length: new TextEncoder().encode(itemBody).byteLength });
    expect(JSON.parse(itemBody)).toEqual({
      event_id: "0123456789abcdef0123456789abcdef",
      timestamp: 1789657200,
      platform: "javascript",
      level: "error",
      message: "CaseKit sanitized client error",
      tags: { surface: "route_error", route: "cases", code: "route_render_failed" },
      extra: { error_type: "Error" },
    });
  });

  it("builds anonymous PostHog capture payloads without user identity", () => {
    const request = buildPostHogRequest(
      { kind: "product_event", name: "draft_approved", properties: { stage: "review", count: 1 } },
      { POSTHOG_KEY: "phc_test_project_token", POSTHOG_HOST: "https://us.i.posthog.com" },
      now,
    );

    expect(request?.url).toBe("https://us.i.posthog.com/i/v0/e/");
    const payload = JSON.parse(request!.body);
    expect(payload).toEqual({
      api_key: "phc_test_project_token",
      event: "draft_approved",
      distinct_id: "casekit-anonymous",
      properties: {
        $process_person_profile: false,
        $lib: "casekit-observability",
        stage: "review",
        count: 1,
      },
      timestamp: "2026-09-17T15:00:00.000Z",
    });
    expect(request?.body).not.toContain("email");
    expect(request?.body).not.toContain("caseId");
  });

  it("forwards only configured providers and tolerates provider failures", async () => {
    const calls: Array<{ url: string; body: string }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), body: String(init?.body ?? "") });
      return new Response(null, { status: calls.length === 1 ? 202 : 503 });
    };

    const result = await forwardObservabilityEvent(
      { kind: "error", errorType: "UnknownError", surface: "global_error", route: "unknown" },
      {
        env: {
          SENTRY_DSN: "https://public@o123.ingest.sentry.io/123",
          POSTHOG_KEY: "phc_test_project_token",
          POSTHOG_HOST: "https://us.i.posthog.com",
        },
        fetchImpl,
        now,
        eventId: "0123456789abcdef0123456789abcdef",
      },
    );

    expect(result).toEqual({ attempted: 2, delivered: 1 });
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toContain("o123.ingest.sentry.io");
    expect(calls[1].url).toBe("https://us.i.posthog.com/i/v0/e/");
  });

  it("rejects unapproved provider destinations", () => {
    expect(buildSentryRequest(
      { kind: "error", errorType: "Error", surface: "route_error", route: "unknown" },
      "https://public@telemetry.example/123",
      now,
      "0123456789abcdef0123456789abcdef",
    )).toBeNull();
    expect(buildPostHogRequest(
      { kind: "product_event", name: "case_viewed", properties: {} },
      { POSTHOG_KEY: "phc_test_project_token", POSTHOG_HOST: "https://telemetry.example" },
      now,
    )).toBeNull();
  });
});
