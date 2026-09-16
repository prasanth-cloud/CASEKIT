-- Stage 7b hardening: fact revisions participate in the same per-case lock protocol
-- used by draft creation/approval. This replaces the Stage 6 function definition
-- without rewriting an already-applied migration.

create or replace function public.revise_case_facts(
  p_case_id uuid,
  p_expected_version integer,
  p_merchant text,
  p_order_id text,
  p_order_date date,
  p_item_description text,
  p_amount_paid numeric,
  p_delivery_date date,
  p_promised_date date,
  p_issue_type public.case_issue_type,
  p_problem_description text,
  p_customer_request text
) returns public.extracted_facts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_previous public.extracted_facts;
  v_new public.extracted_facts;
  v_next_version integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- Shared lock protocol with draft create/approve RPCs.
  perform 1
  from public.cases c
  where c.id = p_case_id and c.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Case not found';
  end if;

  select * into v_previous
  from public.extracted_facts f
  where f.case_id = p_case_id and f.is_current
  for update;

  if found then
    if v_previous.version <> p_expected_version then
      raise exception 'Facts changed; reload before saving';
    end if;
    update public.extracted_facts
    set is_current = false
    where id = v_previous.id;
    v_next_version := v_previous.version + 1;
  else
    if p_expected_version <> 0 then
      raise exception 'Facts changed; reload before saving';
    end if;
    v_next_version := 1;
  end if;

  insert into public.extracted_facts (
    case_id, version, merchant, order_id, order_date, item_description,
    amount_paid, delivery_date, promised_date, issue_type, problem_description,
    customer_request, missing_information, confidence, source_document_ids,
    schema_version, extracted_by, is_current
  ) values (
    p_case_id, v_next_version, nullif(trim(p_merchant), ''), nullif(trim(p_order_id), ''), p_order_date,
    nullif(trim(p_item_description), ''), p_amount_paid, p_delivery_date, p_promised_date, p_issue_type,
    nullif(trim(p_problem_description), ''), nullif(trim(p_customer_request), ''),
    '[]'::jsonb, null,
    '{}'::uuid[],
    'user-review-v1', 'user', true
  ) returning * into v_new;

  insert into public.audit_events(user_id, case_id, actor_type, action, changes, supporting_document_ids)
  values (
    v_user_id,
    p_case_id,
    'user',
    'facts.revised',
    jsonb_build_object(
      'from_version', coalesce(v_previous.version, 0),
      'to_version', v_next_version,
      'provenance', 'user_review'
    ),
    '{}'::uuid[]
  );

  return v_new;
end;
$$;

revoke all on function public.revise_case_facts(uuid,integer,text,text,date,text,numeric,date,date,public.case_issue_type,text,text) from public, anon;
grant execute on function public.revise_case_facts(uuid,integer,text,text,date,text,numeric,date,date,public.case_issue_type,text,text) to authenticated;
