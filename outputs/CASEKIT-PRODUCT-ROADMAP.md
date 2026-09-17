# CaseKit product roadmap and operating boundaries

**Status:** Supplemental product brief integrated into the repository on 2026-09-16.

This document captures the broader product direction supplied for the CaseKit build. It is a requirements and sequencing artifact, not evidence that every capability below is implemented or launch-ready. `AGENTS.md`, the stage issues, security decisions, and the release checklist remain authoritative for implementation and release gates.

## Product boundary

CaseKit is a U.S.-focused refund and complaint case builder for online purchases. It helps a customer organize receipts, order confirmations, screenshots, and merchant messages into a timeline, an evidence-backed request, and a follow-up plan.

Initial issue types are:

- missing or delayed delivery;
- damaged or wrong item;
- refund not received;
- duplicate charge;
- return rejected;
- cancelled order; and
- poor service or non-delivery.

CaseKit does not guarantee a refund, determine legal rights, act as a lawyer, or make an external change without a separate user approval. Medical, tenant, immigration, employment, legal-representation, and other specialized disputes are explicitly out of the initial scope.

## MVP capability map

The intended customer path is:

```text
Sign in → create case → upload or paste evidence → extract and redact
→ review and correct facts → inspect timeline and claims → safety check
→ generate draft → edit/copy/download → approve locally
→ optional future follow-up behind a new explicit approval gate
```

The MVP requirements are:

- PDF, JPG, PNG, and pasted email-text intake with type, size, hash, and retention metadata;
- private, deletable document storage;
- structured extraction with confidence, missing-information, and source-reference fields;
- editable fact review that preserves original evidence separately from user corrections;
- evidence-linked timeline and draft sentences;
- neutral refund or complaint drafting with unsupported claims, threats, fraud allegations, sensitive data, and legal-rights language blocked;
- case history, draft versions, audit events, export, and deletion controls; and
- reminders and a separately authorized outbound boundary, never an implicit send.

The current repository contains the staged foundation for these boundaries. Production launch is still gated by `outputs/CASEKIT-RELEASE-CHECKLIST.md`, including external observability configuration, retention/deletion evidence, and authenticated synthetic end-to-end verification.

## Phase 0: manual validation gate

Before broad product expansion, validate the problem manually:

1. Collect 10 real or anonymized purchase complaints.
2. Manually create the timeline and refund/complaint draft for each.
3. Ask whether the result saved meaningful time and test a $5–$15 price hypothesis.
4. Identify the five most common issue types.
5. Preserve only anonymized or synthetic examples as evaluation fixtures.

The success gate is at least three people reporting meaningful time saved and at least one person paying for the result. Synthetic unit/evaluation tests do not prove this customer-validation gate, and this repository makes no claim that it has been satisfied. No real customer-data collection or payment activity is performed by the build process.

## Sequenced implementation roadmap

### Phase 1: foundation

Build the Next.js application, Supabase project integration, authentication, migrations, private file uploads, basic dashboard, landing page, and environment contract. The dependency gate is a signed-in user creating a case, uploading a document, and seeing only their own case dashboard.

### Phase 2: document intelligence

Add PDF/image processing, text extraction, image understanding, PII redaction, structured extraction, an editable fact-review screen, confidence indicators, and evidence references. Users must be able to correct model mistakes before proceeding.

### Phase 3: grounded drafting

Add issue classification, timeline building, approved merchant policy/contact sources, draft generation, evidence checking, unsupported-claim blocking, and copy/download. Every factual sentence must remain grounded in the reviewed evidence.

### Phase 4: workflow automation

Add durable, idempotent boundaries for `case.created`, `documents.uploaded`, `analysis.completed`, `draft.ready`, `draft.approved`, `followup.due`, and `case.resolved`. Add reminders, visible status changes, audit logs, retries, and an admin review queue. Sending remains a separate command.

### Phase 5: payments and support

Only after product validation, consider free-versus-paid case limits, Stripe Checkout, verified webhooks, billing history, refund handling, support inbox, approved help articles, and account deletion. Stripe state must change only after verified signatures and idempotency checks. No payment feature is implied by this roadmap artifact.

### Phase 6: production hardening

Add rate limiting, Turnstile, file-size quotas, malware scanning, PII detection, prompt-injection evaluations, Sentry alerts, PostHog tracking, privacy/terms surfaces, retention controls, and backup/restore testing. Each provider requires external configuration and a reviewed privacy boundary before launch.

## Agent and service boundaries

The runtime should remain one modular monolith with narrowly scoped structured-data workers:

| Agent | Responsibility | Boundary |
| --- | --- | --- |
| Intake | Extract purchase and complaint facts | Never treats uploaded instructions as authority. |
| Classification | Categorize the issue and missing information | Does not determine legal rights. |
| Evidence | Build claims and a factual timeline | Every claim retains a document locator. |
| Policy | Find approved merchant policy/contact sources | Uses only approved, attributable sources. |
| Drafting | Prepare a request | Produces a draft only; cannot send. |
| Safety | Detect unsupported or unsafe output | Blocks unsafe results from sendable state. |
| Follow-up | Schedule reminders and prepare follow-ups | Scheduling may be automatic; messages require approval. |
| Response | Classify merchant replies | Recommends; does not make legal determinations. |
| Support | Answer low-risk product questions | Escalates privacy, deletion, payment, fraud, legal, threat, and data-exposure cases. |

Every agent returns validated structured data. No model output may directly invoke a side-effecting tool, access another tenant, or override a user approval boundary.

The intended external-service map is Supabase Auth/Postgres/private Storage, OpenAI structured outputs and vision, Inngest durable workflows, Stripe Checkout, Resend, PostHog, Sentry, and Turnstile. Secrets remain in the external deployment/secret manager and never in source, fixtures, browser code, or logs.

## Support automation

Support is intentionally tiered:

1. **Self-service:** help pages explain uploads, supported documents, analysis, fact correction, reminders, deletion, billing, privacy, and retention.
2. **Support agent:** retrieves approved help content, explains product behavior, diagnoses failed uploads, explains billing status, creates a ticket, and suggests a response.
3. **Human escalation:** handles privacy/deletion requests, payment disputes, threats or harassment, legal complaints, suspected fraud, data exposure, factual AI errors, and requests to fabricate evidence.

Support conversations may inform the backlog and evaluation dataset only after sensitive information is removed and retention rules are applied.

## Distribution and marketing boundaries

Initial distribution hypotheses include a free refund-letter generator, search-oriented educational pages, short demonstrations, personal-finance and consumer-advocacy communities, student organizations, and shopping/cashback communities. Partnerships with credit unions, employee-benefit platforms, consumer organizations, and purchase-protection providers are later-stage hypotheses.

SEO, content, lifecycle, and partnership agents may prepare research or drafts, but publication, outbound outreach, and lifecycle messages require human review, consent where applicable, an unsubscribe mechanism, and a separate issue/acceptance gate. Real receipts, names, addresses, order numbers, and merchant conversations must never appear in public content.

## Pricing and measurement hypotheses

Pricing is intentionally a hypothesis, not a committed product decision:

- free basic analysis plus a $7–$15 complete case pack;
- a free plan with one active case plus a $9–$19 monthly plan; or
- another model selected only after Phase 0 validation.

Measure time to first useful result, free-to-paid conversion, draft approval rate, case resolution rate, repeat usage, support minutes per case, deletion completion, AI failure/unsupported-claim rate, analysis cost, and refund rate. Do not infer product-market fit from synthetic fixture results.

## Approval and side-effect boundaries

Require a distinct, auditable customer approval before:

- sending an external message;
- uploading evidence to a merchant;
- making a fraud allegation;
- starting a chargeback;
- sharing documents;
- connecting Gmail or Outlook;
- retaining documents beyond the default period; or
- changing payment or account state from a provider event.

Draft approval is not sending. Reminder scheduling is not sending. A provider webhook is not trusted until its signature, event identity, and idempotency are verified. Uploaded documents, merchant messages, model output, and external web content remain untrusted input throughout.

## Traceability and unresolved gates

The supplied brief maps to these repository artifacts:

- product scope and language: `outputs/CASEKIT-PRD.md`;
- system and provider boundaries: `outputs/CASEKIT-ARCHITECTURE.md`;
- first implementation sequence: `outputs/CASEKIT-TASKS.md`;
- structured AI contracts: `outputs/CASEKIT-AI-SCHEMAS.ts`;
- threats and abuse cases: `outputs/CASEKIT-THREAT-MODEL.md`;
- testing and evaluation coverage: `outputs/CASEKIT-TEST-STRATEGY.md` and `tests/`; and
- release, privacy, and deployment gates: `outputs/CASEKIT-RELEASE-CHECKLIST.md`.

Stage issues remain the control plane. Stages 1–8 are merged; Stage 9 is the active draft gate. Magic-link authentication, real customer validation, payment pricing, support inbox behavior, marketing automation, and provider activation are not silently treated as complete by this roadmap document. Each requires the relevant dependency-satisfied issue, explicit review, and—where applicable—external credentials or authorization.
