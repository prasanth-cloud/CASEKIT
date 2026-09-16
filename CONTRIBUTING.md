# Contributing to CaseKit

## Source of truth
GitHub is the source of truth for code and implementation work. Slack is for communication, decisions, alerts, and summaries.

## Branch workflow
1. Start from the latest `main`.
2. Create a focused branch such as `feature/cases-table`, `fix/document-upload`, `design/case-workspace`, or `chore/ci`.
3. Keep one logical change per branch.
4. Open a pull request into `main`.
5. Include what changed, why, screenshots for UI work, testing performed, known limitations, and the related issue.
6. Do not merge failing builds or unresolved blocking review feedback.

## Codex / AI-agent rules
Before changing code, agents must inspect the existing implementation and read `README.md`, `DESIGN.md`, and this file. Preserve working functionality unless an issue explicitly authorizes a behavior change.

Agents should not perform broad rewrites when a focused change will solve the task. UI agents must follow `DESIGN.md`. Each completed task should result in a reviewable branch/PR rather than silently modifying unrelated areas.

## Definition of done
A task is complete when its acceptance criteria are met, relevant tests/checks pass, UI states are handled where applicable, documentation is updated when behavior changes, and the PR is reviewable.

## Slack routing
- Product requirements and decisions → #casekit-product
- UI/UX references and approvals → #casekit-design
- Engineering discussion → #casekit-engineering
- Bugs → #casekit-bugs
- Customer learning → #casekit-customer-feedback
- Growth experiments → #casekit-growth
- Agent execution/status → #casekit-agent-activity
- Production/release summaries → #casekit-releases
