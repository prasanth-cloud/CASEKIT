# CaseKit release checklist

This checklist is the release gate for the first production launch. A deploy that builds successfully is not a launch approval.

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

The default is disabled. `node scripts/check-release-gates.mjs --production` fails until every value is present and valid. The browser boundary emits only sanitized custom events; it does not make network requests itself and does not include messages, stacks, case IDs, document contents, email addresses, or uploaded text.

## Security and privacy review

- [ ] Supabase security and performance advisors reviewed after every migration.
- [ ] RLS and private Storage isolation tested with two synthetic users.
- [ ] Uploaded-document prompt injection, PII, unsupported source, unsafe-language, and deletion fixtures pass.
- [ ] Sentry redaction and PostHog event payloads are inspected in a non-production environment.
- [x] Retention/deletion boundary has synthetic ownership, expiry, retry, private-path, and content-free audit contract coverage in `lib/documents/deletion.test.ts` and `tests/integration/document-deletion-boundary.test.ts`.
- [ ] Production-like retention/deletion execution uses disposable synthetic records and private Storage only; no real customer data may be used for this verification.
- [ ] No service-role keys, provider secrets, customer data, or real outbound destinations are present in source, fixtures, logs, or browser bundles.
- [ ] Draft approval, reminder scheduling, and outbound authorization remain separate from sending.

## Production verification

- [x] Stage 9 safe implementation deployment is READY on the intended `main` merge and has no deployment-scoped error/fatal logs after verification traffic.
- [x] Build error logs are empty apart from known non-fatal platform warnings.
- [ ] Runtime error aggregation and error/fatal logs are empty after authenticated synthetic smoke traffic.
- [ ] Public smoke routes return expected status codes and security headers on the final launch candidate.
- [ ] Authenticated E2E uses a disposable synthetic account only; no real customer data or provider side effects.
- [ ] Rollback target and incident owner are recorded before launch.

Until external observability configuration/provider payload review, production-like synthetic retention/deletion execution, authenticated synthetic E2E, and explicit human release approval are supplied, Stage 9 remains fail-closed for public launch.
