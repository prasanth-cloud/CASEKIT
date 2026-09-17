# Stage 9 final verification attempt — 2026-09-17

## Decision

**HOLD.** Verification was executed, but the full authenticated workflow is not
working end to end. Do not confuse a READY deployment and passing unit tests with
a complete product or release approval.

Scope: production revision associated with main `3488951bd9ed48ecad491b72f797f5728c4a5a46`,
deployment `dpl_8M9hy9hNrm6hP5D65sQ86zQssbu2`,
`https://casekit-d6whxqybm-prasanth-clouds-projects.vercel.app`,
alias `https://casekit-nu.vercel.app`. READY rechecked during this run.
Main CI run [35247521121](https://github.com/prasanth-cloud/CASEKIT/actions/runs/35247521121) succeeded.
No application code, schema, production flags, or production deployment changed in this verification update.

## Authenticated synthetic smoke

Used a newly created, confirmed, disposable Supabase account with an example.invalid
email. No invitation email, real customer data, external sending, payment, or model
provider call was used.

1. Signed in through production UI; the empty owned Cases queue loaded.
2. Created synthetic case `34461c31-3358-48ba-ada0-6d8c0cd4b3b5` with 172 bytes
   of pasted test evidence and 30-day retention.
3. Verified private Storage and document metadata
   `d8b46105-b568-4292-973b-d93fa9ae6f4c`; status uploaded.
4. Saved reviewed facts through the UI: immutable version 1, user-sourced provenance.
5. Marked ready for drafting: case moved to processing, with explicit no-send message.
6. AI panel showed zero verified document-backed claims and a disabled Generate
   grounded draft button. Database counts confirmed zero claims and drafts.
7. Communications and outbound command counts remained zero.

**Failure:** `lib/workflows/analyze-evidence.ts` exists and has tests, but no
application caller invokes it. Intake uploads and inserts metadata without
dispatching analysis. User-reviewed values intentionally do not become document
evidence. Consequently the ordinary new-case journey cannot reach a grounded
draft. Seeding verified claims would bypass the missing workflow and is not an
acceptable release test.

The Home surface also still displays foundation-stage mock content. This evidence
does not certify all navigation destinations as complete. No draft approval or
follow-up happy path was reached in this run; their unit/contract coverage is not
a substitute for authenticated E2E.

## Retention/deletion production-like execution

Only the disposable record above was used:

- Authenticated production delete route with reason retention_expired rejected the
  future retention date (303 error redirect); the object remained downloadable.
- Set only that fixture's retention date to one minute in the past.
- Called the same authenticated production route: 303 success, deleted status and
  deleted_at, with one content-free document.deleted audit event.
- The immediate post-delete download unexpectedly succeeded once. A subsequent
  authenticated check/retry denied download; Storage metadata count was zero.
  Record eventual removal as passed, **not instantaneous revocation**. CDN delay
  is a possible explanation, not a proven diagnosis: no cache headers were captured
  on the first read. Supabase documents asynchronous cache invalidation in
  [Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn).
- Repeated deletion succeeded without duplicating the audit event.
- Under an authenticated database role with a different synthetic auth.uid,
  document SELECT returned no row and finalization raised Document not found.
  This is a role/claim isolation test, not two browser sessions.
- Removed test auth sessions and the exact disposable Auth user only after
  verifying Storage empty. Cascading cleanup left zero fixture users, cases,
  documents, and Storage objects. Content-free append-only audits were retained.
- Reloading the old case in Chrome redirected to login.

This tests explicit deletion/expiry enforcement, not an automatic retention
scheduler. It does not certify cached copies already downloaded by a client.

## Checks and remaining gates

- 24 Vitest files / 89 tests passed, including integration/eval/a11y contracts.
- Six Node release-gate tests passed.
- Lint passed with the existing extraction-schema.test.ts unused-variable warning;
  typecheck and production build passed.
- Local public smoke passed. Production /login, /manifest.webmanifest, /robots.txt
  returned 200; unauthenticated /cases returned 307. DENY and nosniff headers present.
- Production deployment error query for the last 30 minutes returned no entries
  after synthetic traffic. Request samples showed expected 200/303 responses.
- Fresh Supabase advisors: five previously reviewed intentional authenticated
  SECURITY DEFINER warnings, three unused-index INFO notices, plus disabled
  leaked-password protection. Review/resolve the latter before security sign-off:
  [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Existing production Sentry/PostHog delivery evidence is recorded on issue #16.
  The checklist's **non-production raw payload inspection remains open**.
- Full upload-to-draft E2E, immediate deletion-access behavior, and outstanding
  provider/security gates prevent release sign-off. Human approval already given
  by the owner does not erase these technical findings.

## Rollback owner and target

Incident/release owner: **Prasanth Bugga**, GitHub **prasanth-cloud**, owner of the
CaseKit Vercel/Supabase environment. No separate on-call backup has been designated.
Codex may assist with investigation; the owner controls incident decisions.

Current deployment: `dpl_8M9hy9hNrm6hP5D65sQ86zQssbu2`.

Telemetry configuration rollback candidate: **`dpl_6SVEvfwDnc2jC3bLBRA4zzFzik4a`**,
`https://casekit-4fdrdg3d1-prasanth-clouds-projects.vercel.app`.
READY rechecked on 2026-09-17. This is the earlier deployment before observability
enablement, not proof of a fully working upload-to-draft release; the same workflow
gap exists. Recheck its frozen environment/configuration before any incident action.

Prepared command (not executed):

```sh
vercel rollback casekit-4fdrdg3d1-prasanth-clouds-projects.vercel.app --scope prasanth-clouds-projects
```

1. Owner declares incident and records scope on issue #16; stop accepting real data.
2. Inspect the exact candidate, its build-time flags, and schema compatibility.
   Do not roll back before the document-deletion fix or weaken RLS.
3. For telemetry problems, disable both observability flags for future builds and
   roll back/promote only a verified compatible artifact. Browser NEXT_PUBLIC flags
   are build-time values; changing an environment setting alone is insufficient.
4. Verify production alias, READY status, public auth boundary/security headers,
   disposable authenticated smoke, provider behavior, and error logs after rollback.
5. Keep the current forward-only Supabase schema. An application rollback cannot
   restore deleted objects or undo database changes. Do not run down migrations,
   restore customer data, rotate secrets, or change billing without incident-specific
   authorization and a reviewed recovery plan.

No rollback was performed. This plan is not a tested rollback drill.
