# CaseKit release checklist

This checklist is the release gate for the first production launch. A deploy that builds successfully is not a launch approval.

## Verification status — 2026-09-17

**HOLD: full authenticated upload-to-draft E2E did not pass.** Sign-in, intake,
private Storage, reviewed fact persistence, and the ready transition passed.
Draft generation remained disabled with zero verified document-backed claims.
The analysis module has no application caller on this revision. Do not seed claims
manually to turn this into a passing end-to-end test.

See [verification evidence and rollback plan](CASEKIT-RELEASE-VERIFICATION-2026-09-17.md).
The human approval and observability flags were enabled previously; they do not
override these unresolved verification gates. No new production release was made
for this documentation update.

## Automated checks

Run from a clean checkout:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm exec vitest run tests/integration
pnpm exec vitest run tests/a11y
pnpm exec vitest run tests/evals
node --test scripts/release-gates.test.mjs
pnpm build
node scripts/public-smoke.mjs
node scripts/check-release-gates.mjs --production
```

`test:e2e` starts the built app locally and checks the public login surface, unauthenticated redirect, manifest, and robots route. It never signs in, uploads a document, sends email, or charges money.

## External configuration gate

Configure these values in Vercel or another secret manager. Do not commit them:

- `CASEKIT_RELEASE_APPROVED=true` after human release review;
- `CASEKIT_OBSERVABILITY_ENABLED=true`;
- `SENTRY_DSN`;
- `POSTHOG_KEY` and optional `POSTHOG_HOST` using HTTPS; and
- `NEXT_PUBLIC_CASEKIT_OBSERVABILITY=true` only when the reviewed provider bridge is deployed.

The default is disabled. `node scripts/check-release-gates.mjs --production` fails until every value is present and valid. The browser boundary emits sanitized custom events and, when enabled, contacts only the same-origin bridge; it does not contact providers directly and does not include messages, stacks, case IDs, document contents, email addresses, or uploaded text.

When enabled, the browser sends the same allowlisted payload to the same-origin `/api/observability` route. The route requires a same-origin request, caps the body at 4 KiB, reparses the payload, and forwards only fixed/redacted fields to Sentry and anonymous PostHog capture. Provider keys remain server-only.

## Security and privacy review

- [x] Supabase security and performance advisors rechecked on the current schema; unresolved findings are recorded below.
- [ ] RLS and private Storage isolation tested with two synthetic users.
- [x] Uploaded-document prompt injection, PII, unsupported source, unsafe-language, and deletion fixtures pass.
- [ ] Sentry redaction and PostHog event payloads are inspected in a non-production environment.
- [x] Retention/deletion boundary has synthetic ownership, expiry, retry, private-path, and content-free audit contract coverage in `lib/documents/deletion.test.ts` and `tests/integration/document-deletion-boundary.test.ts`.
- [x] Production-like retention/deletion execution used disposable synthetic records and private Storage only; eventual removal passed with the immediate-access limitation recorded below.
- [ ] No service-role keys, provider secrets, customer data, or real outbound destinations are present in source, fixtures, logs, or browser bundles.
- [ ] Draft approval, reminder scheduling, and outbound authorization remain separate from sending.

## Production verification

- [x] Stage 9 safe implementation deployment is READY on the intended `main` merge and has no deployment-scoped error/fatal logs after verification traffic.
- [x] Build error logs are empty apart from known non-fatal platform warnings.
- [x] Deployment-scoped error query was empty after authenticated synthetic smoke traffic (bounded 30-minute window, not all-time aggregation).
- [x] Public smoke routes returned expected status codes and security headers on the tested deployment.
- [ ] Authenticated E2E uses a disposable synthetic account only; no real customer data or provider side effects.
- [x] Rollback target and incident owner are recorded before launch; no rollback drill was performed.

## Latest evidence

- [x] Fresh security/performance advisor review completed. Five intentional
  authenticated SECURITY DEFINER warnings and three unused-index notices remain;
  leaked-password protection is also disabled. This is not a clean security sign-off.
- [x] All 89 Vitest tests, including integration, eval, accessibility-contract,
  privacy, and deletion coverage, passed; six release-gate tests passed.
- [x] Lint, typecheck, production build, and local public smoke passed.
  Lint retains one existing unused-variable warning.
- [x] Production public routes and DENY/nosniff headers passed.
- [x] Disposable authenticated intake/review smoke executed and cleaned up.
- [ ] Full authenticated upload-to-grounded-draft journey passes (blocked as above).
- [x] Future retention blocked deletion; expired retention removed the object;
  retry retained exactly one content-free deletion audit event.
- [ ] Immediate post-delete inaccessibility is established: one immediate read
  succeeded; the next read was denied. Eventual deletion passed, not immediate revocation.
- [x] A different synthetic auth claim could not read/finalize the document
  under the authenticated database role (not a second browser account E2E).
- [x] Cleanup: zero test Auth users, cases, documents, or Storage objects;
  append-only content-free audit events retained. Reopening the case redirected to login.
- [x] Deployment-scoped error query returned no entries after smoke traffic.
  This bounded log observation does not prove all-time runtime health.
- [x] Incident owner and exact READY rollback target recorded in the linked plan.
- [ ] Non-production provider payload inspection completed (production delivery
  evidence does not substitute for this requirement).

Stage 9 remains open. Do not declare public launch readiness, merge a release
change, close the issue, or advance stages until the unchecked gates are resolved.
