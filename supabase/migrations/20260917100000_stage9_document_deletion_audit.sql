-- Stage 9b: tenant-scoped document deletion finalization.
-- Storage removal happens first through the authenticated private Storage policy.
-- This SECURITY INVOKER RPC then atomically soft-deletes owned metadata and appends
-- a content-free audit event. Audit rows remain immutable.

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

create or replace function public.finalize_document_deletion(
  p_case_id uuid,
  p_document_id uuid,
  p_expected_storage_path text,
  p_reason text
) returns public.documents
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_document public.documents;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_reason not in ('user_request', 'retention_expired') then
    raise exception 'Invalid deletion reason';
  end if;

  select * into v_document
  from public.documents d
  where d.id = p_document_id
    and d.case_id = p_case_id
    and d.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Document not found';
  end if;

  if v_document.storage_path <> p_expected_storage_path then
    raise exception 'Document storage path changed';
  end if;

  if p_reason = 'retention_expired'
     and (v_document.retention_until is null or v_document.retention_until > now()) then
    raise exception 'Document retention period has not expired';
  end if;

  if v_document.status = 'deleted' and v_document.deleted_at is not null then
    return v_document;
  end if;

  update public.documents
  set status = 'deleted', deleted_at = now()
  where id = p_document_id
    and case_id = p_case_id
    and user_id = v_user_id
  returning * into v_document;

  insert into public.audit_events(
    user_id, case_id, actor_type, action, changes, supporting_document_ids
  ) values (
    v_user_id,
    p_case_id,
    'user',
    'document.deleted',
    jsonb_build_object(
      'document_id', p_document_id,
      'reason', p_reason,
      'storage_removed', true
    ),
    '{}'::uuid[]
  );

  return v_document;
end;
$$;

revoke all on function public.finalize_document_deletion(uuid,uuid,text,text) from public, anon;
grant execute on function public.finalize_document_deletion(uuid,uuid,text,text) to authenticated;

-- Existing audit INSERT grant is preserved. No audit UPDATE or DELETE privilege is introduced.
