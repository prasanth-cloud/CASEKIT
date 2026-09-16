-- Stage 8: enforce that an outbound command owner matches its case owner.

alter table public.outbound_email_commands
  add constraint outbound_email_commands_case_user_fkey
  foreign key (case_id, user_id) references public.cases(id, user_id) on delete cascade;

create index outbound_email_commands_case_user
  on public.outbound_email_commands(case_id, user_id);
