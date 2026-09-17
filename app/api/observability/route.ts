import { NextResponse } from "next/server";
import { forwardObservabilityEvent } from "../../../lib/observability/providers";
import { parseSafeObservabilityEvent } from "../../../lib/observability/privacy";

const maxPayloadBytes = 4096;
const rateLimitWindowMs = 60_000;
const rateLimitMaxRequests = 60;
const rateLimitMaxEntries = 2048;
const rateLimitBuckets = new Map<string, { startedAt: number; count: number }>();

function response(status: number) {
  return new NextResponse(null, { status, headers: { "cache-control": "no-store" } });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

function requestKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() || "unknown";
}

function withinRateLimit(request: Request) {
  const now = Date.now();
  const key = requestKey(request);
  const current = rateLimitBuckets.get(key);
  if (!current || now - current.startedAt >= rateLimitWindowMs) {
    if (rateLimitBuckets.size >= rateLimitMaxEntries) {
      for (const [bucketKey, bucket] of rateLimitBuckets) {
        if (now - bucket.startedAt >= rateLimitWindowMs) rateLimitBuckets.delete(bucketKey);
      }
    }
    if (rateLimitBuckets.size >= rateLimitMaxEntries && !current) return false;
    rateLimitBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= rateLimitMaxRequests) return false;
  current.count += 1;
  return true;
}

async function readBodyWithinLimit(request: Request): Promise<{ body: string; oversized: boolean }> {
  if (!request.body) return { body: "", oversized: false };

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxPayloadBytes) {
        try {
          await reader.cancel();
        } catch {
          // The payload is already rejected; a failed cancellation must not change the status.
        }
        return { body: "", oversized: true };
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    return { body, oversized: false };
  } catch {
    return { body: "", oversized: false };
  }
}

export async function POST(request: Request) {
  if (process.env.CASEKIT_OBSERVABILITY_ENABLED !== "true") return response(204);
  if (!sameOrigin(request)) return response(403);
  if (!withinRateLimit(request)) return response(429);

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > maxPayloadBytes) return response(413);

  const { body, oversized } = await readBodyWithinLimit(request);
  if (oversized) return response(413);

  let input: unknown;
  try {
    input = JSON.parse(body);
  } catch {
    return response(400);
  }

  const event = parseSafeObservabilityEvent(input);
  if (!event) return response(400);

  await forwardObservabilityEvent(event);
  return response(204);
}
