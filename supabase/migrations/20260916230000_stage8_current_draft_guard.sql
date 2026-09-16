-- Stage 8: enforce current-draft verification for the live outbound boundary.
-- The trigger protects the already-applied authorization function while keeping
-- a clean migration replay safe when the function is replaced above.

create or replace function public.enforce_outbound_command_current_draft()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_latest_version integer;
begin
  select max(d.version) into v_latest_version
  from public.drafts d
  where d.case_id = new.case_id;

  if v_latest_version is distinct from new.draft_version then
    raise exception 'The current approved draft is required';
  end if;

  return new;
end;
$$;

drop trigger if exists outbound_email_commands_current_draft on public.outbound_email_commands;

create trigger outbound_email_commands_current_draft
  before insert on public.outbound_email_commands
  for each row execute function public.enforce_outbound_command_current_draft();

revoke all on function public.enforce_outbound_command_current_draft() from public, anon, authenticated;
