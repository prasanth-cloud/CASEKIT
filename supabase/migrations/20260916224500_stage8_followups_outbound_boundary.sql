-- Stage 8: consent-gated reminders and a non-sending outbound authorization boundary.
-- This migration records explicit intent only. No provider or email send is performed.

alter table public.profiles
  add column if not exists notification_consent boolean not null default false;

alter table public.reminders
  add column if not exists idempotency_key text;

update public.reminders
set idempotency_key = gen_random_uuid()::text
where idempotency_key is null;

alter table public.reminders
  alter column idempotency_key set default gen_random_uuid()::text,
  alter column idempotency_key set not null;

alter table public.reminders
  add constraint reminders_idempotency_key_valid check (char_length(trim(idempotency_key)) between 1 and 128);

create unique index reminders_case_idempotency_key
  on public.reminders(case_id, idempotency_key);

create type public.outbound_email_command_status as enum ('prepared', 'sent', 'failed', 'cancelled');

create table public.outbound_email_commands (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  draft_id uuid not null references public.drafts(id) on delete cascade,
  draft_version integer not null check (draft_version > 0),
  recipient_email text not null check (char_length(trim(recipient_email)) between 3 and 320),
  attachment_document_ids uuid[] not null default '{}',
  destination_confirmed boolean not null default false,
  attachments_confirmed boolean not null default false,
  send_authorized_at timestamptz not null,
  status public.outbound_email_command_status not null default 'prepared',
  sent_at timestamptz,
  idempotency_key text not null check (char_length(trim(idempotency_key)) between 1 and 128),
  created_at timestamptz not null default now(),
  unique (case_id, idempotency_key)
);

alter table public.outbound_email_commands enable row level security;

create policy outbound_email_commands_owner_select
  on public.outbound_email_commands
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.reminders from authenticated;
grant select on public.reminders to authenticated;
revoke all privileges on public.outbound_email_commands from anon, authenticated;
grant select on public.outbound_email_commands to authenticated;

create or replace function public.schedule_case_reminder(
  p_case_id uuid,
  p_reminder_type text,
  p_due_at timestamptz,
  p_idempotency_key text
) returns public.reminders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_reminder public.reminders;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if trim(coalesce(p_idempotency_key, '')) = '' or char_length(trim(p_idempotency_key)) > 128 then
    raise exception 'Reminder retry key is invalid';
  end if;

  if p_reminder_type not in ('follow_up', 'review_needed') then
    raise exception 'Reminder type is not user schedulable';
  end if;

  if p_due_at <= now() or p_due_at > now() + interval '1 year' then
    raise exception 'Reminder date is outside the allowed window';
  end if;

  if not exists (
    select 1
    from public.cases c
    join public.profiles p on p.id = c.user_id
    where c.id = p_case_id
      and c.user_id = v_user_id
      and c.status in ('approved', 'waiting_for_response')
      and p.notification_consent is true
  ) then
    raise exception 'Notification consent and an approved case are required';
  end if;

  insert into public.reminders(case_id, reminder_type, due_at, status, idempotency_key)
  values (p_case_id, p_reminder_type, p_due_at, 'scheduled', trim(p_idempotency_key))
  on conflict (case_id, idempotency_key) do nothing
  returning * into v_reminder;

  if not found then
    select * into v_reminder
    from public.reminders r
    where r.case_id = p_case_id and r.idempotency_key = trim(p_idempotency_key);
    return v_reminder;
  end if;

  insert into public.audit_events(user_id, case_id, actor_type, action, changes, supporting_document_ids)
  values (
    v_user_id, p_case_id, 'user', 'reminder.scheduled',
    jsonb_build_object('reminder_id', v_reminder.id, 'reminder_type', v_reminder.reminder_type, 'due_at', v_reminder.due_at, 'idempotent', true),
    '{}'
  );

  return v_reminder;
end;
$$;

create or replace function public.dismiss_case_reminder(
  p_case_id uuid,
  p_reminder_id uuid
) returns public.reminders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_reminder public.reminders;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select r.* into v_reminder
  from public.reminders r
  join public.cases c on c.id = r.case_id
  where r.id = p_reminder_id and r.case_id = p_case_id and c.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Reminder not found';
  end if;

  if v_reminder.status = 'dismissed' then
    return v_reminder;
  end if;

  if v_reminder.status <> 'scheduled' then
    raise exception 'Reminder cannot be dismissed in its current state';
  end if;

  update public.reminders
  set status = 'dismissed'
  where id = v_reminder.id
  returning * into v_reminder;

  insert into public.audit_events(user_id, case_id, actor_type, action, changes, supporting_document_ids)
  values (
    v_user_id, p_case_id, 'user', 'reminder.dismissed',
    jsonb_build_object('reminder_id', v_reminder.id), '{}'
  );

  return v_reminder;
end;
$$;

create or replace function public.authorize_outbound_email(
  p_case_id uuid,
  p_draft_id uuid,
  p_draft_version integer,
  p_recipient_email text,
  p_attachment_document_ids uuid[],
  p_destination_confirmed boolean,
  p_attachments_confirmed boolean,
  p_send_authorized boolean,
  p_idempotency_key text
) returns public.outbound_email_commands
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_draft public.drafts;
  v_latest_version integer;
  v_command public.outbound_email_commands;
  v_recipient_email text := lower(trim(coalesce(p_recipient_email, '')));
  v_attachment_ids uuid[] := coalesce(p_attachment_document_ids, '{}'::uuid[]);
  v_idempotency_key text := trim(coalesce(p_idempotency_key, ''));
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if trim(v_idempotency_key) = '' or char_length(v_idempotency_key) > 128 then
    raise exception 'Outbound retry key is invalid';
  end if;

  if p_draft_version < 1 or not p_destination_confirmed or not p_attachments_confirmed or not p_send_authorized then
    raise exception 'Destination, attachment, and explicit send confirmations are required';
  end if;

  if v_recipient_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Destination email is invalid';
  end if;

  if not exists (
    select 1 from public.cases c
    where c.id = p_case_id and c.user_id = v_user_id and c.status in ('approved', 'waiting_for_response')
  ) then
    raise exception 'An approved case is required before outbound authorization';
  end if;

  select max(d.version) into v_latest_version
  from public.drafts d
  where d.case_id = p_case_id;

  if v_latest_version is distinct from p_draft_version then
    raise exception 'The current approved draft is required';
  end if;

  select d.* into v_draft
  from public.drafts d
  where d.id = p_draft_id
    and d.case_id = p_case_id
    and d.version = p_draft_version
    and d.status = 'approved'
    and d.approved_at is not null
    and d.sent_at is null
  for update;

  if not found then
    raise exception 'The current approved draft is required';
  end if;

  if exists (
    select 1
    from unnest(v_attachment_ids) attachment_id
    where not exists (
      select 1 from public.documents d
      where d.id = attachment_id
        and d.case_id = p_case_id
        and d.deleted_at is null
        and d.status = 'ready'
    )
  ) then
    raise exception 'An attachment is unavailable or outside this case';
  end if;

  insert into public.outbound_email_commands(
    case_id, user_id, draft_id, draft_version, recipient_email, attachment_document_ids,
    destination_confirmed, attachments_confirmed, send_authorized_at, status, idempotency_key
  ) values (
    p_case_id, v_user_id, p_draft.id, v_draft.version, v_recipient_email, v_attachment_ids,
    true, true, now(), 'prepared', v_idempotency_key
  )
  on conflict (case_id, idempotency_key) do nothing
  returning * into v_command;

  if not found then
    select * into v_command
    from public.outbound_email_commands c
    where c.case_id = p_case_id and c.idempotency_key = v_idempotency_key;

    if v_command.draft_id <> p_draft_id
       or v_command.draft_version <> p_draft_version
       or v_command.recipient_email <> v_recipient_email
       or v_command.attachment_document_ids <> v_attachment_ids then
      raise exception 'Outbound retry key was already used for a different command';
    end if;

    return v_command;
  end if;

  insert into public.audit_events(user_id, case_id, actor_type, action, changes, supporting_document_ids)
  values (
    v_user_id, p_case_id, 'user', 'outbound_email.authorized',
    jsonb_build_object(
      'command_id', v_command.id,
      'draft_id', v_command.draft_id,
      'draft_version', v_command.draft_version,
      'destination_confirmed', true,
      'attachments_confirmed', true,
      'attachment_count', cardinality(v_attachment_ids),
      'sent', false
    ),
    v_attachment_ids
  );

  return v_command;
end;
$$;

revoke all on function public.schedule_case_reminder(uuid, text, timestamptz, text) from public, anon;
grant execute on function public.schedule_case_reminder(uuid, text, timestamptz, text) to authenticated;
revoke all on function public.dismiss_case_reminder(uuid, uuid) from public, anon;
grant execute on function public.dismiss_case_reminder(uuid, uuid) to authenticated;
revoke all on function public.authorize_outbound_email(uuid, uuid, integer, text, uuid[], boolean, boolean, boolean, text) from public, anon;
grant execute on function public.authorize_outbound_email(uuid, uuid, integer, text, uuid[], boolean, boolean, boolean, text) to authenticated;
