-- Supabase projects may retain broad default table privileges independently of RLS.
-- Make the intended API surface explicit and least-privilege.
revoke all privileges on public.profiles,public.cases,public.documents,public.extracted_facts,public.evidence_claims,public.sources,public.drafts,public.communications,public.reminders,public.audit_events from anon, authenticated;

grant select,insert,update,delete on public.profiles,public.cases,public.documents,public.extracted_facts,public.evidence_claims,public.drafts,public.communications,public.reminders to authenticated;
grant select on public.sources,public.audit_events to authenticated;
