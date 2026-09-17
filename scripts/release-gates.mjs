const defaultPostHogHost = "https://us.i.posthog.com";

function present(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function evaluateReleaseGates(env = process.env) {
  const postHogHost = present(env.POSTHOG_HOST) ? env.POSTHOG_HOST.trim() : defaultPostHogHost;
  const checks = {
    releaseApproved: env.CASEKIT_RELEASE_APPROVED === "true",
    observabilityEnabled: env.CASEKIT_OBSERVABILITY_ENABLED === "true",
    sentryConfigured: present(env.SENTRY_DSN),
    postHogConfigured: present(env.POSTHOG_KEY) && validHttpsUrl(postHogHost),
    browserBridgeConfigured: env.NEXT_PUBLIC_CASEKIT_OBSERVABILITY === "true",
  };
  const missing = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  return { ready: missing.length === 0, checks, missing };
}
