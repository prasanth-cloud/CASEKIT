create index audit_events_by_user on public.audit_events(user_id);
create index communications_by_case_user on public.communications(case_id,user_id);
create index documents_by_case_user on public.documents(case_id,user_id);
create index evidence_claims_by_document on public.evidence_claims(document_id);
create index reminders_by_case on public.reminders(case_id);
create index sources_by_approver on public.sources(approved_by_admin);
