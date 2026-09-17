import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const origin = "https://casekit.example";

function request(body: string, headers: Record<string, string> = { origin, "content-type": "application/json" }) {
  return new Request(`${origin}/api/observability`, { method: "POST", headers, body });
}

describe("observability route boundary", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("does not parse or forward events while the server flag is disabled", async () => {
    vi.stubEnv("CASEKIT_OBSERVABILITY_ENABLED", "false");
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request("not-json"));

    expect(response.status).toBe(204);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires same-origin requests and rejects malformed events", async () => {
    vi.stubEnv("CASEKIT_OBSERVABILITY_ENABLED", "true");

    expect((await POST(request("{}", { origin: "https://attacker.example", "content-type": "application/json" }))).status).toBe(403);
    expect((await POST(request("not-json"))).status).toBe(400);
  });

  it("reparses a synthetic event and forwards the reviewed payloads", async () => {
    vi.stubEnv("CASEKIT_OBSERVABILITY_ENABLED", "true");
    vi.stubEnv("SENTRY_DSN", "https://public@o123.ingest.sentry.io/123");
    vi.stubEnv("POSTHOG_KEY", "phc_test_project_token");
    vi.stubEnv("POSTHOG_HOST", "https://us.i.posthog.com");
    const calls: Array<{ url: string; body: string }> = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), body: String(init?.body ?? "") });
      return new Response(null, { status: 200 });
    });

    const response = await POST(request(JSON.stringify({
      kind: "error",
      errorType: "Error",
      surface: "route_error",
      route: "/cases/private-case",
      code: "route_render_failed",
      message: "customer email owner@example.com",
      stack: "customer document text",
    })));

    expect(response.status).toBe(204);
    expect(calls).toHaveLength(2);
    expect(calls.every((call) => !call.body.includes("private-case") && !call.body.includes("owner@example.com"))).toBe(true);
    expect(calls.every((call) => !call.body.includes("customer document text"))).toBe(true);
  });

  it("caps oversized requests before JSON parsing", async () => {
    vi.stubEnv("CASEKIT_OBSERVABILITY_ENABLED", "true");
    const oversized = JSON.stringify({ kind: "product_event", name: "case_viewed", properties: { stage: "x".repeat(5000) } });
    expect((await POST(request(oversized))).status).toBe(413);
  });

  it("caps chunked bodies even when content length is absent", async () => {
    vi.stubEnv("CASEKIT_OBSERVABILITY_ENABLED", "true");
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(4090));
        controller.enqueue(new Uint8Array(20));
        controller.close();
      },
    });
    const streamedRequest = new Request(`${origin}/api/observability`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    expect((await POST(streamedRequest)).status).toBe(413);
  });

  it("bounds repeated requests from one forwarded client address", async () => {
    vi.stubEnv("CASEKIT_OBSERVABILITY_ENABLED", "true");
    const clientHeaders = { origin, "content-type": "application/json", "x-forwarded-for": "198.51.100.24" };
    const body = JSON.stringify({ kind: "product_event", name: "case_viewed", properties: {} });

    for (let count = 0; count < 60; count += 1) {
      expect((await POST(request(body, clientHeaders))).status).toBe(204);
    }
    expect((await POST(request(body, clientHeaders))).status).toBe(429);
  });
});
