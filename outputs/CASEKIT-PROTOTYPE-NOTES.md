# CaseKit prototype notes

The first working slice is a buildless, browser-only prototype in the site project. It intentionally keeps all state in the current tab and makes no network calls.

## Demonstrated flow

1. Attach a supported file or paste a purchase email.
2. Choose “Use a sample case” if no fixture is available.
3. Select “Analyze evidence.”
4. Review the editable facts and evidence timeline.
5. Select “Generate safe draft.”
6. Edit, copy, or download the request.
7. Select “Mark ready to send” to see the approval boundary; nothing is sent.

## Current limitations

- PDF and image files are attached and surfaced, but real OCR/document analysis belongs in the production AI pipeline.
- The local parser is heuristic and is not a substitute for schema-validated server processing.
- There is no account, database, retention job, email, payment, or external merchant integration.
- The sample fixture is synthetic and is labeled as such by the product surface.

## Validation performed

- The preview loads with meaningful content and accessible controls.
- The sample flow extracts `Northstar Home`, order `NS-28419`, `$84.99`, the four August 2026 timeline events, and the missing-delivery issue.
- The fact review exposes editable fields and evidence coverage.
- The draft includes the reviewed facts and shows safety checks.
- Local approval visibly states that no message was sent and no evidence was shared.

