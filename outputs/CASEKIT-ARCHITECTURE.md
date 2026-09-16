# CaseKit application architecture

## 1. Architecture decision

Use a modular monolith for the first production release. One Next.js App Router application owns the customer UI, API routes, admin surfaces, and service modules. Supabase provides authentication, Postgres, row-level authorization, and private file storage. Inngest owns durable document processing and reminders. External sending and payment state changes remain explicit, auditable actions.

```text
Browser
  │
  ├── Next.js App Router
  │     ├── marketing and sign-in
  │     ├── customer dashboard / case builder
  │     ├── admin review queue
  │     ├── route handlers / server actions
  │     └── domain modules
  │           ├── auth
  │           ├── cases
  │           ├── documents
  │           ├── ai
  │           ├── policy
  │           ├── billing
  │           ├── email
  │           ├── support
  │           └── workflows
  │
  ├── Supabase Auth + Postgres + private Storage
  ├── Inngest: analysis, retries, reminders, inbound processing
  ├── OpenAI Responses API: structured extraction and drafting
  ├── Stripe Checkout: paid case pack and verified webhooks
  └── Resend, PostHog, Sentry, Turnstile
```

Do not add Kubernetes, microservices, or a dedicated vector database until validated demand and operational scale justify them.

## 2. Module responsibilities

### `lib/documents`

Validates extension, MIME type, byte size, hash, and retention. Writes only to private Storage. Runs malware scanning and redaction before an AI job can read a document. Stores source references and processing status.

### `lib/ai`

Contains versioned prompts, Zod schemas, model adapters, and provenance builders. Every model response is parsed, schema-validated, bounded, and rejected on failure. AI output is never treated as a database query or an instruction source.

### `lib/cases`

Owns case creation, fact versions, user corrections, timeline ordering, evidence claims, status transitions, and audit events. It is the only module allowed to mark a case ready for drafting after review.

### `lib/policy`

Reads only approved merchant policy/contact sources. It may suggest an official route and quote source metadata. It may not decide legal rights, promise a refund, or introduce policy language that is not in an approved source.

### `lib/workflows`

Defines events and durable functions:

```text
case.created
  → documents.uploaded
  → analysis.completed
  → draft.ready
  → draft.approved
  → followup.due
  → case.resolved
```

Each step is idempotent, retryable, and records a correlation ID. A failed step leaves the case in a visible recoverable state.

### `lib/email` and external actions

Drafts can be rendered with React Email. Sending must be a separate command that checks the authenticated user, current draft version, explicit approval timestamp, destination, attachment list, and an idempotency key. The UI should not imply that “approved” means “sent.”

## 3. Production request flows

### Upload and analysis

1. Authenticated client creates an empty case.
2. Server issues a scoped private upload path.
3. Client uploads the file directly to private Storage.
4. Server records hash, type, size, and retention date.
5. Inngest receives `documents.uploaded`.
6. Scanner and redactor complete before content is exposed to a model.
7. Intake, classification, and evidence agents return structured outputs.
8. Facts, claims, and audit event are saved as a new version.
9. Case becomes `needs_review`.

### Draft generation

1. Customer confirms or edits facts.
2. Server creates a stable fact version and source set.
3. Drafting agent receives only the normalized facts and evidence snippets it needs.
4. Safety agent checks unsupported claims, sensitive data, threats, fraud allegations, and legal-rights language.
5. Draft is stored with claim IDs, prompt version, and safety result.
6. Case becomes `draft_ready`.
7. Customer edits or approves the draft; no external side effect occurs.

## 4. Security and privacy invariants

- Every customer query is scoped by `auth.uid()` and a case ownership check.
- Document paths are unguessable and never served publicly.
- Signed download URLs are short-lived and issued only after authorization.
- The system stores hashes and metadata needed for integrity checks.
- Uploaded text is untrusted content, not an instruction hierarchy.
- Prompts, secrets, access tokens, and model credentials never enter customer-visible logs.
- AI output cannot directly invoke a side-effecting tool.
- Sending, evidence sharing, chargebacks, and extended retention each require a separate approval boundary.
- Deletion removes database references and storage objects, then records a minimal audit event without retaining deleted document content.

## 5. Prototype-to-production bridge

The current `dist/` prototype is intentionally buildless and local-only. It uses a small heuristic parser for a representative pasted message and the same UX boundaries production needs: source input, fact review, evidence timeline, grounded draft, and an explicit non-sending approval state.

Replace the parser with server-side versioned schemas and Inngest jobs before accepting real sensitive documents. Do not ship the browser-only heuristic as an AI or privacy claim.

