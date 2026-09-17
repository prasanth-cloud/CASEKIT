import type { SafeErrorEvent, SafeObservabilityEvent } from "./privacy";

const defaultPostHogHost = "https://us.i.posthog.com";
const postHogDistinctId = "casekit-anonymous";
const sentryMessage = "CaseKit sanitized client error";
const allowedPostHogHosts = new Set(["us.i.posthog.com", "eu.i.posthog.com"]);

export type ProviderEnvironment = {
  [key: string]: string | undefined;
  SENTRY_DSN?: string;
  POSTHOG_KEY?: string;
  POSTHOG_HOST?: string;
};

type SentryDsn = {
  publicKey: string;
  host: string;
  projectId: string;
};

type ProviderRequest = {
  url: string;
  headers: Record<string, string>;
  body: string;
};

export type ForwardResult = {
  attempted: number;
  delivered: number;
};

function present(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseSentryDsn(value: unknown): SentryDsn | null {
  if (!present(value)) return null;

  try {
    const url = new URL(value.trim());
    const projectId = url.pathname.replace(/^\/+|\/+$/g, "");
    if (
      url.protocol !== "https:"
      || !url.username
      || !url.hostname
      || url.port
      || url.search
      || url.hash
      || !(url.hostname === "sentry.io" || /^o\d+\.ingest\.(?:(?:de|us)\.)?sentry\.io$/.test(url.hostname))
      || !/^\d+$/.test(projectId)
    ) return null;
    return { publicKey: decodeURIComponent(url.username), host: url.host, projectId };
  } catch {
    return null;
  }
}

function sentryRequest(event: SafeErrorEvent, dsnValue: unknown, now: Date, eventId: string): ProviderRequest | null {
  const dsn = parseSentryDsn(dsnValue);
  if (!dsn) return null;

  const eventPayload = {
    event_id: eventId,
    timestamp: Math.floor(now.getTime() / 1000),
    platform: "javascript",
    level: "error",
    message: sentryMessage,
    tags: {
      surface: event.surface,
      route: event.route,
      ...(event.code ? { code: event.code } : {}),
    },
    extra: { error_type: event.errorType },
  };
  const itemBody = JSON.stringify(eventPayload);
  const envelope = [
    JSON.stringify({ event_id: eventId, sent_at: now.toISOString(), sdk: { name: "casekit-observability", version: "1" } }),
    JSON.stringify({ type: "event", length: new TextEncoder().encode(itemBody).byteLength }),
    itemBody,
    "",
  ].join("\n");

  return {
    url: `https://${dsn.host}/api/${dsn.projectId}/envelope/?sentry_version=7&sentry_key=${encodeURIComponent(dsn.publicKey)}`,
    headers: { "content-type": "application/x-sentry-envelope" },
    body: envelope,
  };
}

function postHogRequest(event: SafeObservabilityEvent, environment: ProviderEnvironment, now: Date): ProviderRequest | null {
  if (!present(environment.POSTHOG_KEY)) return null;

  const host = present(environment.POSTHOG_HOST) ? environment.POSTHOG_HOST.trim() : defaultPostHogHost;
  let url: URL;
  try {
    const hostUrl = new URL(host);
    if (
      hostUrl.protocol !== "https:"
      || hostUrl.port
      || hostUrl.username
      || hostUrl.password
      || hostUrl.search
      || hostUrl.hash
      || !allowedPostHogHosts.has(hostUrl.hostname)
    ) return null;
    url = new URL("/i/v0/e/", hostUrl.origin);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  const properties: Record<string, string | number | boolean> = {
    $process_person_profile: false,
    $lib: "casekit-observability",
  };
  let eventName: string;
  if (event.kind === "error") {
    eventName = "casekit_client_error";
    properties.error_type = event.errorType;
    properties.surface = event.surface;
    properties.route = event.route;
    if (event.code) properties.code = event.code;
  } else {
    eventName = event.name;
    Object.assign(properties, event.properties);
  }

  return {
    url: url.toString(),
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: environment.POSTHOG_KEY.trim(),
      event: eventName,
      distinct_id: postHogDistinctId,
      properties,
      timestamp: now.toISOString(),
    }),
  };
}

function createEventId() {
  return crypto.randomUUID().replaceAll("-", "");
}

export function buildSentryRequest(event: SafeErrorEvent, dsn: string, now = new Date(), eventId = createEventId()) {
  return sentryRequest(event, dsn, now, eventId);
}

export function buildPostHogRequest(event: SafeObservabilityEvent, environment: ProviderEnvironment, now = new Date()) {
  return postHogRequest(event, environment, now);
}

export async function forwardObservabilityEvent(
  event: SafeObservabilityEvent,
  options: { env?: ProviderEnvironment; fetchImpl?: typeof fetch; now?: Date; eventId?: string } = {},
): Promise<ForwardResult> {
  const environment = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? new Date();
  const requests: ProviderRequest[] = [];

  if (event.kind === "error") {
    const request = sentryRequest(event, environment.SENTRY_DSN, now, options.eventId ?? createEventId());
    if (request) requests.push(request);
  }
  const postHog = postHogRequest(event, environment, now);
  if (postHog) requests.push(postHog);

  const results = await Promise.allSettled(
    requests.map(async (request) => {
      const response = await fetchImpl(request.url, {
        method: "POST",
        headers: request.headers,
        body: request.body,
        signal: AbortSignal.timeout(3000),
        redirect: "error",
      });
      return response.ok;
    }),
  );

  return {
    attempted: requests.length,
    delivered: results.filter((result) => result.status === "fulfilled" && result.value).length,
  };
}
