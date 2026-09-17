import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateReleaseGates } from "./release-gates.mjs";

test("release gates fail closed without external configuration", () => {
  const result = evaluateReleaseGates({});
  assert.equal(result.ready, false);
  assert.deepEqual(result.missing, [
    "releaseApproved",
    "observabilityEnabled",
    "sentryConfigured",
    "postHogConfigured",
    "browserBridgeConfigured",
  ]);
});

test("release gates pass only with explicit approval and provider configuration", () => {
  const result = evaluateReleaseGates({
    CASEKIT_RELEASE_APPROVED: "true",
    CASEKIT_OBSERVABILITY_ENABLED: "true",
    SENTRY_DSN: "https://public@o123.ingest.sentry.io/1",
    POSTHOG_KEY: "phc_public_test_key",
    POSTHOG_HOST: "https://us.i.posthog.com",
    NEXT_PUBLIC_CASEKIT_OBSERVABILITY: "true",
  });
  assert.equal(result.ready, true);
  assert.deepEqual(result.missing, []);
});

test("release gates reject insecure provider hosts", () => {
  const result = evaluateReleaseGates({
    CASEKIT_RELEASE_APPROVED: "true",
    CASEKIT_OBSERVABILITY_ENABLED: "true",
    SENTRY_DSN: "https://public@o123.ingest.sentry.io/1",
    POSTHOG_KEY: "phc_public_test_key",
    POSTHOG_HOST: "http://localhost:8000",
    NEXT_PUBLIC_CASEKIT_OBSERVABILITY: "true",
  });
  assert.equal(result.ready, false);
  assert.deepEqual(result.missing, ["postHogConfigured"]);
});

test("release gates reject non-PostHog destinations", () => {
  const result = evaluateReleaseGates({
    CASEKIT_RELEASE_APPROVED: "true",
    CASEKIT_OBSERVABILITY_ENABLED: "true",
    SENTRY_DSN: "https://public@o123.ingest.sentry.io/1",
    POSTHOG_KEY: "phc_public_test_key",
    POSTHOG_HOST: "https://telemetry.example",
    NEXT_PUBLIC_CASEKIT_OBSERVABILITY: "true",
  });
  assert.equal(result.ready, false);
  assert.deepEqual(result.missing, ["postHogConfigured"]);
});

test("release gates reject malformed Sentry DSNs", () => {
  const result = evaluateReleaseGates({
    CASEKIT_RELEASE_APPROVED: "true",
    CASEKIT_OBSERVABILITY_ENABLED: "true",
    SENTRY_DSN: "not-a-dsn",
    POSTHOG_KEY: "phc_public_test_key",
    POSTHOG_HOST: "https://us.i.posthog.com",
    NEXT_PUBLIC_CASEKIT_OBSERVABILITY: "true",
  });
  assert.equal(result.ready, false);
  assert.deepEqual(result.missing, ["sentryConfigured"]);
});
