# CaseKit product requirements document

**Working name:** CaseKit  
**Product:** Refund & Complaint Case Builder  
**Initial market:** U.S. online purchases  
**Document status:** MVP foundation, 2026-09-16

## 1. Product promise

Upload a receipt, order confirmation, screenshot, or merchant message and receive a clear timeline, an evidence-backed refund request, and a follow-up plan in about five minutes.

CaseKit is an organization and drafting tool. It does not guarantee a refund, determine legal rights, act as a lawyer, or send an external message without the customer’s explicit approval.

## 2. Target customer and problem

The first customer is a U.S. consumer who bought something online and is stuck in a common service problem:

- missing or delayed delivery;
- damaged or wrong item;
- refund not received;
- duplicate charge;
- return rejected;
- cancelled order; or
- poor service or non-delivery.

Today, customers must reconstruct a timeline from scattered email, receipts, screenshots, and order pages. They often omit dates, lose the original request, or write a message that is either too vague or more aggressive than the evidence supports.

## 3. MVP outcome

Given one case and one or more purchase documents, a customer can:

1. create a case;
2. upload PDF, JPG, or PNG files or paste email text;
3. see extracted facts and confidence indicators;
4. edit facts before any draft is generated;
5. inspect an evidence-linked timeline;
6. generate a refund or complaint request;
7. see missing-information and safety warnings;
8. copy or download the draft; and
9. mark the draft ready without sending it.

The prototype in `dist/` covers this flow locally in one browser tab. Production should add authentication, private storage, durable processing, reminders, billing, deletion, and audit events in the order described by the architecture document.

## 4. Functional requirements

### Intake

- Accept PDF, JPG, PNG, and pasted email text.
- Enforce file type and size limits before processing.
- Show every attached file and allow removal before analysis.
- Explain that uploaded documents are private, untrusted input.
- Never interpret instructions inside a receipt or email as system instructions.

### Extraction and review

- Extract merchant, order ID, order date, item, amount paid, delivery dates, issue type, problem description, desired resolution, and missing information.
- Return structured data validated against a versioned schema.
- Link each factual claim to a document and source reference.
- Display confidence and allow a human to edit every extracted field.
- Preserve the original source and the customer’s corrected values separately.

### Drafting

- Generate a concise request using only confirmed or clearly qualified facts.
- Prefer a neutral request for a specific resolution and written next step.
- Exclude unsupported legal conclusions, threats, fraud allegations, or invented policy language.
- Display the evidence claims used by the draft.
- Require explicit customer approval before any future send action.

### Case history and controls

- Show case status, timeline, documents, draft versions, and audit events.
- Allow document deletion, account deletion, and data export.
- Apply default retention windows and require explicit consent to extend retention.

## 5. Non-goals for the MVP

- Gmail or Outlook access.
- Autonomous email sending.
- Automatic chargebacks or payment disputes.
- Legal threats or legal representation.
- Medical, tenant, immigration, employment, or other specialized disputes.
- Merchant integrations, browser extension, or mobile app.
- Dozens of countries or languages.
- Unreviewed cold outreach or marketing automation.

## 6. Primary user flow

```text
Landing / sign in
        ↓
Create case
        ↓
Upload documents or paste message
        ↓
Extract and redact facts
        ↓
Customer reviews and corrects facts
        ↓
Timeline + evidence claims
        ↓
Safety check
        ↓
Draft request
        ↓
Customer edits, copies/downloads, and approves locally
        ↓
Optional production follow-up or send flow behind a new approval gate
```

## 7. Acceptance criteria for the MVP

- A signed-in user can create a case and only see their own cases.
- A user can upload supported files privately and remove them.
- A document-processing failure is visible, retryable, and does not create an ungrounded draft.
- Every AI output either validates against its schema or is rejected and logged.
- The review screen makes source references and missing information visible.
- A generated draft has no factual sentence without a source reference or explicit uncertainty label.
- The UI never sends an email, uploads evidence to a merchant, starts a chargeback, or alleges fraud without a separate explicit approval action.
- Account and document deletion are verifiable and reflected in the audit log.
- Lint, typecheck, unit, integration, end-to-end, accessibility, security, and AI evaluation gates pass before release.

## 8. Success metrics

Start with a manual validation gate before broad implementation:

- collect 10 real or anonymized purchase complaints;
- at least three people report that the output saved meaningful time; and
- at least one person pays for the result at a tested price.

After launch, track:

- time to first useful result;
- free-to-paid conversion;
- draft approval rate;
- percentage of cases resolved;
- repeat usage;
- support minutes per case;
- AI failure and unsupported-claim rate;
- deletion completion rate; and
- cost to analyze one case.

## 9. Product language guardrails

Use “organize,” “draft,” “request,” “evidence,” and “review.” Avoid “win,” “guaranteed refund,” “legal advice,” “AI lawyer,” or claims that CaseKit knows a customer’s legal rights.

