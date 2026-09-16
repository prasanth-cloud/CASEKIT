-- Stage 8: cover outbound command foreign keys for ownership and draft lookups.

create index outbound_email_commands_user_id
  on public.outbound_email_commands(user_id);

create index outbound_email_commands_draft_id
  on public.outbound_email_commands(draft_id);
