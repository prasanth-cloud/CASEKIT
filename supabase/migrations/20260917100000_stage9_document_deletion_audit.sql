-- Stage 9b: permit the user-scoped document deletion boundary to append an audit event.
-- Audit rows remain immutable; ownership and fixed actor/action checks remain mandatory.

drop policy if exists audit_user_review_insert on public.audit_events;

create policy audit_user_review_insert
on public.audit_events
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and actor_type = 'user'
  and action in ('facts.revised', 'case.ready_for_drafting', 'document.deleted')
  and case_id is not null
  and exists (
    select 1
    from public.cases c
    where c.id = case_id
      and c.user_id = (select auth.uid())
  )
);

-- Existing INSERT grant is preserved. No UPDATE or DELETE privilege is introduced.
