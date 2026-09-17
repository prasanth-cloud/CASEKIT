"use client";

import { createSafeErrorEvent, createSafeProductEvent, type ObservabilityRoute, type ObservabilitySurface, type ProductEventName } from "./privacy";

const errorEventName = "casekit:observability-error";
const productEventName = "casekit:product-event";

function browserBridgeEnabled() {
  return process.env.NEXT_PUBLIC_CASEKIT_OBSERVABILITY === "true";
}

function sendToServerBridge(event: ReturnType<typeof createSafeErrorEvent> | ReturnType<typeof createSafeProductEvent>) {
  void fetch("/api/observability", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event),
    keepalive: true,
  }).catch(() => undefined);
}

/**
 * Emits a sanitized browser event and forwards the same safe payload to the
 * same-origin server bridge. It never includes an error message, stack, case
 * ID, document content, email address, or other customer input.
 */
export function captureClientError(error: unknown, context: { surface: ObservabilitySurface; route?: ObservabilityRoute; code?: string }) {
  const safeEvent = createSafeErrorEvent(error, context);
  if (browserBridgeEnabled() && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(errorEventName, { detail: safeEvent }));
    sendToServerBridge(safeEvent);
  }
  return safeEvent;
}

export function trackProductEvent(name: ProductEventName, properties: Record<string, unknown> = {}) {
  const safeEvent = createSafeProductEvent(name, properties);
  if (browserBridgeEnabled() && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(productEventName, { detail: safeEvent }));
    sendToServerBridge(safeEvent);
  }
  return safeEvent;
}
