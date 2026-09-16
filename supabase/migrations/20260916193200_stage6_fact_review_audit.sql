-- Stage 6: allow authenticated users to append only their own fixed user-review audit events.
-- Audit rows remain immutable through the Data API: no UPDATE or DELETE grants/policies are added.

create policy audit_user_review_insert
on public.audit_events
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and actor_type = 'user'
  and action in ('facts.revised', 'case.ready_for_drafting')
  and case_id is not null
  and exists (
    select 1
    from public.cases c
    where c.id = case_id
      and c.user_id = (select auth.uid())
  )
);

grant insert on public.audit_events to authenticated;
