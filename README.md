# CaseKit

CaseKit is a professional case-management workspace focused on cases, documents, tasks, timelines, contacts, deadlines, and contextual AI assistance.

## Local development

Requirements: Node.js 22+ and pnpm 10.

```bash
pnpm install
pnpm dev
```

Quality checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Stage 1 is intentionally shell-only. Authentication, persistence, uploads, AI provider calls, email sending, and payments are not wired yet. The existing `dist/` browser prototype remains preserved as a reference.

## Development workflow

- `main` is the stable integration branch.
- Build work on focused feature branches.
- Open pull requests for review before merging.
- Keep changes small enough to review and test.
- Preserve existing working functionality during redesigns.
- Product decisions should be reflected in GitHub issues and relevant CaseKit Slack channels.

## Initial product areas

- Home / actionable work queue
- Cases
- Case workspace
- Documents
- Tasks
- Calendar and deadlines
- Contacts
- AI Assistant

See `DESIGN.md` for the UI/UX system and `CONTRIBUTING.md` for the engineering workflow.
