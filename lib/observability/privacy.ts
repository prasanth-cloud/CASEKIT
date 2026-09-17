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
    if (typeof value === "boolean") properties[key] = value;
    else if (typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 1_000_000) properties[key] = value;
    else if (typeof value === "string" && value.length <= 64 && /^[a-z0-9_. -]+$/i.test(value)) properties[key] = value;
  }
  return properties;
}

export function createSafeProductEvent(name: ProductEventName, properties: Record<string, unknown> = {}): SafeProductEvent {
  if (!eventNames.has(name)) throw new Error("Unsupported observability event.");
  return { kind: "product_event", name, properties: sanitizeProductProperties(properties) };
}
