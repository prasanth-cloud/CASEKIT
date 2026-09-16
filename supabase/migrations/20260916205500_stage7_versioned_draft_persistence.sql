-- Stage 7b: versioned grounded draft persistence and explicit non-sending approval.
-- Direct client mutation is removed; authenticated users use narrowly scoped RPCs.

alter table public.drafts
  add column if not exists structured_content jsonb not null default '{"sentences":[]}'::jsonb,
  add column if not exists merchant_source_ids uuid[] not null default '{}';

alter table public.drafts
  add constraint drafts_structured_content_object
  check (jsonb_typeof(structured_content) = 'object'),
  add constraint drafts_safety_result_object
  check (jsonb_typeof(safety_result) = 'object');

-- Reads remain tenant-scoped by existing RLS. Mutations must pass through the RPCs below.
revoke insert, update, delete on public.drafts from authenticated;
revoke all on public.drafts from anon;
grant select on public.drafts to authenticated;

create or replace function public.create_case_draft_version(
  p_case_id uuid,
  p_facts_version integer,
  p_expected_draft_version integer,
  p_subject text,
  p_body text,
  p_structured_content jsonb,
  p_evidence_claim_ids uuid[],
  p_merchant_source_ids uuid[],
  p_safety_result jsonb,
  p_prompt_version text
) returns public.drafts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_current_facts public.extracted_facts;
  v_current_version integer;
  v_next_version integer;
  v_draft public.drafts;
  v_sentence jsonb;
  v_claim_id text;
  v_combined_text text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- Serialize all version transitions for a case and verify tenant ownership.
  perform 1
  from public.cases c
  where c.id = p_case_id and c.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Case not found';
  end if;

  select * into v_current_facts
  from public.extracted_facts f
  where f.case_id = p_case_id and f.is_current;

  if not found or v_current_facts.version <> p_facts_version then
    raise exception 'Current reviewed facts are required';
  end if;

  if trim(coalesce(p_subject, '')) = '' or trim(coalesce(p_body, '')) = '' then
    raise exception 'Draft subject and body are required';
  end if;

  if jsonb_typeof(p_structured_content) <> 'object'
     or jsonb_typeof(p_structured_content -> 'sentences') <> 'array' then
    raise exception 'Structured draft content is invalid';
  end if;

  if jsonb_typeof(p_safety_result) <> 'object'
     or coalesce((p_safety_result ->> 'passed')::boolean, false) is not true
     or coalesce(jsonb_typeof(p_safety_result -> 'reasons'), '') <> 'array'
     or jsonb_array_length(p_safety_result -> 'reasons') <> 0 then
    raise exception 'Draft has not passed safety review';
  end if;

  if trim(coalesce(p_prompt_version, '')) = '' then
    raise exception 'Prompt version is required';
  end if;

  -- Every evidence claim must belong to this case.
  if exists (
    select 1
    from unnest(coalesce(p_evidence_claim_ids, '{}'::uuid[])) claim_id
    where not exists (
      select 1 from public.evidence_claims ec
      where ec.id = claim_id and ec.case_id = p_case_id
    )
  ) then
    raise exception 'Draft references evidence outside this case';
  end if;

  -- Every merchant source must be approved before it can ground a draft.
  if exists (
    select 1
    from unnest(coalesce(p_merchant_source_ids, '{}'::uuid[])) source_id
    where not exists (
      select 1 from public.sources s
      where s.id = source_id and s.approved_by_admin is not null
    )
  ) then
    raise exception 'Draft references an unapproved merchant source';
  end if;

  -- Every factual sentence must cite at least one claim persisted with this draft.
  for v_sentence in
    select value from jsonb_array_elements(p_structured_content -> 'sentences')
  loop
    if coalesce((v_sentence ->> 'factual')::boolean, false) then
      if jsonb_typeof(v_sentence -> 'claimIds') <> 'array'
         or jsonb_array_length(v_sentence -> 'claimIds') = 0 then
        raise exception 'Factual draft sentence is missing evidence';
      end if;

      for v_claim_id in
        select value from jsonb_array_elements_text(v_sentence -> 'claimIds')
      loop
        if not (v_claim_id::uuid = any(coalesce(p_evidence_claim_ids, '{}'::uuid[]))) then
          raise exception 'Factual draft sentence references unavailable evidence';
        end if;
      end loop;
    end if;
  end loop;

  -- Defense in depth for the safety categories that can be checked deterministically.
  v_combined_text := p_subject || ' ' || p_body;
  if v_combined_text ~* '\m(fraud|scam|criminal|stole|theft)\M' then
    raise exception 'Draft contains a blocked fraud allegation';
  end if;
  if v_combined_text ~* '\m(threaten|hurt|harm|destroy|retaliate|ruin)\M' then
    raise exception 'Draft contains blocked threatening language';
  end if;
  if v_combined_text ~* '(illegal|unlawful|violation of law|my legal rights?|statutory rights?|\msue\M|lawsuit)' then
    raise exception 'Draft contains blocked legal-rights language';
  end if;
  if v_combined_text ~ '[0-9]{3}-[0-9]{2}-[0-9]{4}' then
    raise exception 'Draft contains blocked sensitive data';
  end if;

  select max(d.version) into v_current_version
  from public.drafts d
  where d.case_id = p_case_id;

  v_current_version := coalesce(v_current_version, 0);
  if v_current_version <> p_expected_draft_version then
    raise exception 'Draft changed; reload before saving';
  end if;
  v_next_version := v_current_version + 1;

  insert into public.drafts (
    case_id,
    facts_version,
    version,
    subject,
    body,
    structured_content,
    attachments,
    evidence_claim_ids,
    merchant_source_ids,
    safety_result,
    prompt_version,
    status
  ) values (
    p_case_id,
    p_facts_version,
    v_next_version,
    trim(p_subject),
    p_body,
    p_structured_content,
    '[]'::jsonb,
    coalesce(p_evidence_claim_ids, '{}'::uuid[]),
    coalesce(p_merchant_source_ids, '{}'::uuid[]),
    p_safety_result,
    p_prompt_version,
    case when v_next_version = 1 then 'generated'::public.draft_status else 'edited'::public.draft_status end
  ) returning * into v_draft;

  update public.cases
  set status = 'draft_ready'
  where id = p_case_id and user_id = v_user_id;

  insert into public.audit_events(user_id, case_id, actor_type, action, changes, prompt_version, supporting_document_ids)
  values (
    v_user_id,
    p_case_id,
    'user',
    'draft.version_created',
    jsonb_build_object('draft_id', v_draft.id, 'version', v_next_version, 'facts_version', p_facts_version),
    p_prompt_version,
    v_current_facts.source_document_ids
  );

  return v_draft;
end;
$$;

create or replace function public.approve_case_draft(
  p_case_id uuid,
  p_draft_id uuid,
  p_expected_draft_version integer
) returns public.drafts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_draft public.drafts;
  v_latest_version integer;
  v_current_facts_version integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- Serialize approval against concurrent draft revisions and verify tenant ownership.
  perform 1
  from public.cases c
  where c.id = p_case_id and c.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Case not found';
  end if;

  select max(d.version) into v_latest_version
  from public.drafts d
  where d.case_id = p_case_id;

  if v_latest_version is null or v_latest_version <> p_expected_draft_version then
    raise exception 'Draft changed; reload before approval';
  end if;

  select * into v_draft
  from public.drafts d
  where d.id = p_draft_id
    and d.case_id = p_case_id
    and d.version = p_expected_draft_version
  for update;

  if not found then
    raise exception 'Current draft not found';
  end if;

  if v_draft.status not in ('generated', 'edited') or v_draft.sent_at is not null then
    raise exception 'Draft cannot be approved in its current state';
  end if;

  if coalesce((v_draft.safety_result ->> 'passed')::boolean, false) is not true
     or coalesce(jsonb_typeof(v_draft.safety_result -> 'reasons'), '') <> 'array'
     or jsonb_array_length(v_draft.safety_result -> 'reasons') <> 0 then
    raise exception 'Draft has not passed safety review';
  end if;

  select f.version into v_current_facts_version
  from public.extracted_facts f
  where f.case_id = p_case_id and f.is_current;

  if v_current_facts_version is null or v_current_facts_version <> v_draft.facts_version then
    raise exception 'Reviewed facts changed after this draft was created';
  end if;

  update public.drafts
  set status = 'approved', approved_at = now()
  where id = v_draft.id
  returning * into v_draft;

  update public.cases
  set status = 'approved'
  where id = p_case_id and user_id = v_user_id;

  insert into public.audit_events(user_id, case_id, actor_type, action, changes, prompt_version, supporting_document_ids)
  select
    v_user_id,
    p_case_id,
    'user',
    'draft.approved',
    jsonb_build_object('draft_id', v_draft.id, 'version', v_draft.version, 'sent', false),
    v_draft.prompt_version,
    coalesce(array_agg(distinct ec.document_id) filter (where ec.document_id is not null), '{}'::uuid[])
  from public.evidence_claims ec
  where ec.id = any(v_draft.evidence_claim_ids)
    and ec.case_id = p_case_id;

  return v_draft;
end;
$$;

revoke all on function public.create_case_draft_version(uuid,integer,integer,text,text,jsonb,uuid[],uuid[],jsonb,text) from public, anon;
grant execute on function public.create_case_draft_version(uuid,integer,integer,text,text,jsonb,uuid[],uuid[],jsonb,text) to authenticated;
revoke all on function public.approve_case_draft(uuid,uuid,integer) from public, anon;
grant execute on function public.approve_case_draft(uuid,uuid,integer) to authenticated;
