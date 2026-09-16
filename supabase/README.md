# CaseKit Supabase foundation

Stage 2 establishes persistence only. It does not enable AI, email, payments, or public document access.

## Security invariants

- Every customer-owned public table has RLS enabled.
- Policies explicitly target `authenticated` and include ownership predicates.
- `documents` and `communications` use composite `(case_id,user_id)` foreign keys so a child row cannot claim a case owned by another user.
- `case-documents` is private and limited to 10 MiB and approved MIME types.
- Storage object paths must be `user_id/case_id/<opaque-file-name>`; Storage RLS checks both path user and case ownership.
- No `service_role` key belongs in browser code.
- No `SECURITY DEFINER` functions are introduced.
- Customer audit events are read-only through the Data API.

## Verification before release

1. Apply the migration to an empty project.
2. Run Supabase Security and Performance Advisors.
3. Confirm the bucket is private.
4. Verify all public customer tables have RLS enabled.
5. Test two authenticated users: user A can CRUD only A-owned rows and objects; user B cannot read/update/delete A-owned rows or objects.
6. Verify an authenticated user cannot write `sources` or `audit_events` through the Data API.
7. Verify Storage rejects paths whose first segment is another user or whose second segment is a case owned by another user.

## Recovery

The migration is additive and intended for a fresh CaseKit project. During pre-production, recover by recreating the empty project and reapplying reviewed migrations. Once production customer data exists, use forward-only corrective migrations and backups; do not destructively reset production.
