"use client";

import { createSafeErrorEvent, createSafeProductEvent, type ObservabilityRoute, type ObservabilitySurface, type ProductEventName } from "./privacy";

const errorEventName = "casekit:observability-error";
const productEventName = "casekit:product-event";

function browserBridgeEnabled() {
  return process.env.NEXT_PUBLIC_CASEKIT_OBSERVABILITY === "true";
}

/**
 * Emits a sanitized browser event for an externally configured provider bridge.
 * It never sends a request itself and never includes an error message, stack,
 * case ID, document content, email address, or other customer input.
 */
export function captureClientError(error: unknown, context: { surface: ObservabilitySurface; route?: ObservabilityRoute; code?: string }) {
  const safeEvent = createSafeErrorEvent(error, context);
  if (browserBridgeEnabled() && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(errorEventName, { detail: safeEvent }));
  }
  return safeEvent;
}

export function trackProductEvent(name: ProductEventName, properties: Record<string, unknown> = {}) {
  const safeEvent = createSafeProductEvent(name, properties);
  if (browserBridgeEnabled() && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(productEventName, { detail: safeEvent }));
  }
  return safeEvent;
}
