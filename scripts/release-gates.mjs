const defaultPostHogHost = "https://us.i.posthog.com";
const allowedPostHogHosts = new Set(["us.i.posthog.com", "eu.i.posthog.com"]);

function present(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validPostHogHost(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && !url.port
      && !url.username
      && !url.password
      && !url.search
      && !url.hash
      && allowedPostHogHosts.has(url.hostname);
  } catch {
    return false;
  }
}

function validSentryDsn(value) {
  if (!present(value)) return false;
  try {
    const url = new URL(value.trim());
    const projectId = url.pathname.replace(/^\/+|\/+$/g, "");
    return url.protocol === "https:"
      && present(url.username)
      && present(url.hostname)
      && !url.port
      && !url.search
      && !url.hash
      && (url.hostname === "sentry.io" || /^o\d+\.ingest\.(?:(?:de|us)\.)?sentry\.io$/.test(url.hostname))
      && /^\d+$/.test(projectId);
  } catch {
    return false;
  }
}

export function evaluateReleaseGates(env = process.env) {
  const postHogHost = present(env.POSTHOG_HOST) ? env.POSTHOG_HOST.trim() : defaultPostHogHost;
  const checks = {
    releaseApproved: env.CASEKIT_RELEASE_APPROVED === "true",
    observabilityEnabled: env.CASEKIT_OBSERVABILITY_ENABLED === "true",
    sentryConfigured: validSentryDsn(env.SENTRY_DSN),
    postHogConfigured: present(env.POSTHOG_KEY) && validPostHogHost(postHogHost),
    browserBridgeConfigured: env.NEXT_PUBLIC_CASEKIT_OBSERVABILITY === "true",
  };
  const missing = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  return { ready: missing.length === 0, checks, missing };
}
