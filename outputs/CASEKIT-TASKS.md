# CaseKit first 20 implementation tasks

Each task is intentionally narrow enough for one engineering agent to own without editing the same files as another agent. Complete the database and security foundation before adding side effects.

| # | Owner | Task | Acceptance criteria |
|---:|---|---|---|
| 1 | Product Architect | Convert the PRD into route, state, and permission requirements. | All MVP routes, case states, approval gates, and non-goals are documented; unresolved decisions are listed. |
| 2 | Database Agent | Create Supabase migrations for profiles, cases, documents, facts, claims, drafts, communications, reminders, and audit events. | Migration applies to a clean project; enums and indexes exist; rollback or recovery notes are documented. |
| 3 | Security Agent | Add RLS policies and private Storage object policies. | Cross-user reads and writes fail in tests; signed URLs require ownership; bucket is not public. |
| 4 | Frontend Agent | Build authenticated shell, case list, and empty states. | A signed-in user can create a case; empty, loading, error, and mobile states are accessible. |
| 5 | Frontend Agent | Build upload and pasted-text intake. | Supported types and size limits are enforced; files can be removed; no upload is public. |
| 6 | Workflow Agent | Add `case.created` and `documents.uploaded` events. | Events are idempotent, correlated, retryable, and visible in audit records. |
| 7 | AI Pipeline Agent | Implement document normalization, redaction, and safe content extraction. | Text, image, and PDF fixtures produce bounded normalized input; malware and unsupported files stop processing. |
| 8 | AI Pipeline Agent | Implement `ExtractedFactsSchema` and the intake prompt. | Valid JSON parses; invalid, oversized, or instruction-following output is rejected and logged without source leakage. |
| 9 | AI Pipeline Agent | Implement classification and missing-information checks. | All seven issue types are supported; uncertain classification is surfaced; no legal-rights conclusion is produced. |
| 10 | Evidence Agent | Build evidence claims and timeline references. | Every event and claim points to a document locator; claims cannot be marked verified by the model. |
| 11 | Frontend Agent | Build editable fact-review screen. | User can edit every field; changes create a new fact version; confidence and missing information are visible. |
| 12 | Policy Agent | Build approved merchant source registry and contact-route lookup. | Only allowlisted official sources are used; stale or unapproved content is excluded; URLs are shown to the user. |
| 13 | AI Pipeline Agent | Implement draft generation and safety check. | Draft validates; every factual sentence maps to evidence; unsafe output is blocked; approval is always required. |
| 14 | Frontend Agent | Build draft editor, copy/download, and explicit approval state. | Edits are saved as a new draft version; copy/download work; approval does not send anything. |
| 15 | Workflow Agent | Add follow-up reminders and `followup.due`. | User can schedule or dismiss a reminder; retries are idempotent; notification consent is checked. |
| 16 | Payments Agent | Add Stripe Checkout for paid case packs. | Test-mode checkout works; webhook signatures are verified; no payment state changes from unverified input. |
| 17 | Support Agent | Add help-center retrieval and escalation paths. | Low-risk product questions use approved help content; deletion, payment, privacy, fraud, and legal complaints escalate. |
| 18 | QA Agent | Create fixtures, unit tests, integration tests, accessibility tests, and AI evaluations. | Tests cover normal, missing, contradictory, prompt-injection, PII, and unsafe-draft cases; no real side effects occur. |
| 19 | Security Agent | Run threat-model review and abuse-case review. | High-severity findings have owners and mitigations; cross-tenant and document-exposure tests pass. |
| 20 | Release Agent | Configure Vercel, CI, Sentry, PostHog, retention checks, and release gates. | CI runs lint, typecheck, unit, integration, E2E, accessibility, and eval checks; production secrets are external. |

## Parallelization rule

Agents may work in parallel only when their file ownership is disjoint. Database and security changes land before dependent UI or workflow work. The release agent integrates after the application and tests are stable.

