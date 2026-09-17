export type ObservabilitySurface = "route_error" | "global_error";
export type ObservabilityRoute = "login" | "home" | "cases" | "case" | "new_case" | "unknown";

export type ProductEventName =
  | "case_viewed"
  | "case_created"
  | "draft_generated"
  | "draft_approved"
  | "reminder_scheduled"
  | "reminder_dismissed"
  | "outbound_authorization_recorded";

export type SafeErrorEvent = {
  kind: "error";
  errorType: "Error" | "UnknownError";
  surface: ObservabilitySurface;
  route: ObservabilityRoute;
  code?: string;
};

export type SafeProductEvent = {
  kind: "product_event";
  name: ProductEventName;
  properties: Record<string, string | number | boolean>;
};

export type SafeObservabilityEvent = SafeErrorEvent | SafeProductEvent;

const routes = new Set<ObservabilityRoute>(["login", "home", "cases", "case", "new_case", "unknown"]);
const eventNames = new Set<ProductEventName>([
  "case_viewed",
  "case_created",
  "draft_generated",
  "draft_approved",
  "reminder_scheduled",
  "reminder_dismissed",
  "outbound_authorization_recorded",
]);
const propertyNames = new Set(["status", "success", "count", "surface", "stage", "reasonCode"]);
const safePropertyValues = new Map([
  ["status", new Set(["pending", "approved", "rejected", "scheduled", "dismissed", "failed", "completed", "deleted"])],
  ["surface", new Set(["login", "home", "cases", "case", "new_case", "route_error", "global_error"])],
  ["stage", new Set(["intake", "analysis", "review", "follow_up", "reminder", "release", "stage9"])],
]);

export function normalizeObservabilityRoute(value: unknown): ObservabilityRoute {
  return typeof value === "string" && routes.has(value as ObservabilityRoute) ? value as ObservabilityRoute : "unknown";
}

function normalizeCode(value: unknown) {
  if (typeof value !== "string" || !/^[a-z][a-z0-9_.-]{0,48}$/i.test(value)) return undefined;
  return value;
}

export function createSafeErrorEvent(error: unknown, context: { surface: ObservabilitySurface; route?: unknown; code?: unknown }): SafeErrorEvent {
  const event: SafeErrorEvent = {
    kind: "error",
    errorType: error instanceof Error ? "Error" : "UnknownError",
    surface: context.surface,
    route: normalizeObservabilityRoute(context.route),
  };
  const code = normalizeCode(context.code);
  if (code) event.code = code;
  return event;
}

export function sanitizeProductProperties(input: Record<string, unknown> = {}) {
  const properties: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!propertyNames.has(key)) continue;
    if (key === "success" && typeof value === "boolean") properties[key] = value;
    else if (key === "count" && typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 1_000_000) properties[key] = value;
    else if (typeof value === "string" && value.length <= 64 && /^[a-z0-9_. -]+$/i.test(value)) {
      if (safePropertyValues.has(key)) {
        if (safePropertyValues.get(key)?.has(value)) properties[key] = value;
      } else if (key === "reasonCode" && /^[a-z][a-z0-9_.-]{0,48}$/i.test(value)) {
        properties[key] = value;
      }
    }
  }
  return properties;
}

export function createSafeProductEvent(name: ProductEventName, properties: Record<string, unknown> = {}): SafeProductEvent {
  if (!eventNames.has(name)) throw new Error("Unsupported observability event.");
  return { kind: "product_event", name, properties: sanitizeProductProperties(properties) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isObservabilitySurface(value: unknown): value is ObservabilitySurface {
  return value === "route_error" || value === "global_error";
}

function isErrorType(value: unknown): value is SafeErrorEvent["errorType"] {
  return value === "Error" || value === "UnknownError";
}

/**
 * Parses the untrusted request body accepted by the server-side bridge.
 * Unknown fields are ignored and all values pass through the same allowlists
 * used by browser callers.
 */
export function parseSafeObservabilityEvent(input: unknown): SafeObservabilityEvent | null {
  if (!isRecord(input) || typeof input.kind !== "string") return null;

  if (input.kind === "error") {
    if (!isErrorType(input.errorType) || !isObservabilitySurface(input.surface)) return null;
    const event: SafeErrorEvent = {
      kind: "error",
      errorType: input.errorType,
      surface: input.surface,
      route: normalizeObservabilityRoute(input.route),
    };
    const code = normalizeCode(input.code);
    if (code) event.code = code;
    return event;
  }

  if (input.kind === "product_event" && typeof input.name === "string" && eventNames.has(input.name as ProductEventName)) {
    return {
      kind: "product_event",
      name: input.name as ProductEventName,
      properties: sanitizeProductProperties(isRecord(input.properties) ? input.properties : {}),
    };
  }

  return null;
}
