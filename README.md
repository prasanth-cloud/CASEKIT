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
pnpm exec vitest run tests/integration
pnpm exec vitest run tests/a11y
pnpm exec vitest run tests/evals
node --test scripts/release-gates.test.mjs
pnpm build && node scripts/public-smoke.mjs
node scripts/check-release-gates.mjs --production
```

The original Stage 1 shell and `dist/` browser prototype remain preserved as references. Later-stage workflows are gated behind review and external configuration; a successful build alone is not production launch approval.

`node scripts/check-release-gates.mjs --production` intentionally fails closed until external Sentry and PostHog configuration and explicit release approval are present. Provider keys belong only in Vercel or another secret manager; they are never committed or exposed to the browser. The CI release check reports missing production configuration without launching anything.

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
