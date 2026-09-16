-- CaseKit secure persistence foundation
-- Stage 2 / Issue #4. All customer-facing tables are RLS protected.

create extension if not exists pgcrypto;

create type public.case_issue_type as enum ('missing_delivery','damaged_item','refund_not_received','duplicate_charge','return_rejected','cancelled_order','poor_service');
create type public.case_status as enum ('draft','processing','needs_review','draft_ready','approved','waiting_for_response','resolved','closed','blocked');
create type public.document_status as enum ('uploaded','scanning','ready','failed','deleted');
create type public.draft_status as enum ('generated','edited','approved','sent','archived');
create type public.communication_direction as enum ('incoming','outgoing');
create type public.reminder_status as enum ('scheduled','sent','dismissed','cancelled');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text, name text, country text not null default 'US' check (country='US'),
 marketing_consent boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.cases (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 merchant_name text, issue_type public.case_issue_type, jurisdiction text not null default 'US' check (jurisdiction='US'),
 status public.case_status not null default 'draft', desired_resolution text,
 confidence_score numeric(4,3) check (confidence_score between 0 and 1),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), closed_at timestamptz,
 unique(id,user_id)
);
create table public.documents (
 id uuid primary key default gen_random_uuid(), case_id uuid not null, user_id uuid not null,
 storage_path text not null unique, file_type text not null check (file_type in ('application/pdf','image/jpeg','image/png','text/plain','message/rfc822')),
 file_hash text not null, byte_size bigint not null check (byte_size>0 and byte_size<=10485760),
 status public.document_status not null default 'uploaded', redaction_status text not null default 'pending' check (redaction_status in ('pending','complete','failed','not_required')),
 retention_until timestamptz, created_at timestamptz not null default now(), deleted_at timestamptz,
 unique(case_id,file_hash), foreign key(case_id,user_id) references public.cases(id,user_id) on delete cascade
);
create table public.extracted_facts (
 id uuid primary key default gen_random_uuid(), case_id uuid not null references public.cases(id) on delete cascade,
 version integer not null default 1 check(version>0), merchant text, order_id text, order_date date, item_description text,
 amount_paid numeric(12,2) check(amount_paid is null or amount_paid>=0), delivery_date date, promised_date date,
 issue_type public.case_issue_type, problem_description text, customer_request text,
 missing_information jsonb not null default '[]'::jsonb, confidence numeric(4,3) check(confidence between 0 and 1),
 source_document_ids uuid[] not null default '{}', schema_version text not null, extracted_by text not null default 'ai',
 is_current boolean not null default true, created_at timestamptz not null default now(), unique(case_id,version)
);
create unique index extracted_facts_one_current_per_case on public.extracted_facts(case_id) where is_current;
create table public.evidence_claims (
 id uuid primary key default gen_random_uuid(), case_id uuid not null references public.cases(id) on delete cascade,
 claim_text text not null, document_id uuid references public.documents(id) on delete set null,
 source_reference jsonb not null, confidence numeric(4,3) check(confidence between 0 and 1), verified boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.sources (
 id uuid primary key default gen_random_uuid(), merchant_name text not null, source_url text not null,
 source_type text not null check(source_type in ('official_policy','official_contact','approved_help')), content text,
 fetched_at timestamptz, approved_by_admin uuid references public.profiles(id) on delete set null, content_hash text,
 created_at timestamptz not null default now(), unique(merchant_name,source_url)
);
create table public.drafts (
 id uuid primary key default gen_random_uuid(), case_id uuid not null references public.cases(id) on delete cascade,
 facts_version integer not null, version integer not null default 1 check(version>0), subject text not null, body text not null,
 attachments jsonb not null default '[]'::jsonb, evidence_claim_ids uuid[] not null default '{}', safety_result jsonb not null,
 prompt_version text not null, status public.draft_status not null default 'generated', approved_at timestamptz, sent_at timestamptz,
 created_at timestamptz not null default now(), unique(case_id,version)
);
create table public.communications (
 id uuid primary key default gen_random_uuid(), case_id uuid not null, user_id uuid not null,
 direction public.communication_direction not null, channel text not null check(channel in ('email','support_inbox','manual_note')),
 message_id text, content text not null, received_at timestamptz, created_at timestamptz not null default now(),
 foreign key(case_id,user_id) references public.cases(id,user_id) on delete cascade
);
create table public.reminders (
 id uuid primary key default gen_random_uuid(), case_id uuid not null references public.cases(id) on delete cascade,
 reminder_type text not null check(reminder_type in ('follow_up','retention_expiry','review_needed')), due_at timestamptz not null,
 status public.reminder_status not null default 'scheduled', created_at timestamptz not null default now()
);
create table public.audit_events (
 id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete set null,
 case_id uuid references public.cases(id) on delete set null, actor_type text not null check(actor_type in ('user','ai','admin','system')),
 action text not null, changes jsonb not null default '{}'::jsonb, prompt_version text,
 supporting_document_ids uuid[] not null default '{}', created_at timestamptz not null default now()
);

create index cases_by_user_created_at on public.cases(user_id,created_at desc);
create index documents_by_case on public.documents(case_id,created_at desc);
create index evidence_claims_by_case on public.evidence_claims(case_id,created_at desc);
create index reminders_due on public.reminders(status,due_at);
create index audit_events_by_case on public.audit_events(case_id,created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql security invoker set search_path='' as $$ begin new.updated_at=now(); return new; end; $$;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger cases_set_updated_at before update on public.cases for each row execute function public.set_updated_at();

alter table public.profiles enable row level security; alter table public.cases enable row level security;
alter table public.documents enable row level security; alter table public.extracted_facts enable row level security;
alter table public.evidence_claims enable row level security; alter table public.sources enable row level security;
alter table public.drafts enable row level security; alter table public.communications enable row level security;
alter table public.reminders enable row level security; alter table public.audit_events enable row level security;

create policy profiles_select on public.profiles for select to authenticated using ((select auth.uid())=id);
create policy profiles_insert on public.profiles for insert to authenticated with check ((select auth.uid())=id);
create policy profiles_update on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy cases_owner on public.cases for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy documents_owner on public.documents for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy facts_owner on public.extracted_facts for all to authenticated using (exists(select 1 from public.cases c where c.id=case_id and c.user_id=(select auth.uid()))) with check (exists(select 1 from public.cases c where c.id=case_id and c.user_id=(select auth.uid())));
create policy claims_owner on public.evidence_claims for all to authenticated using (exists(select 1 from public.cases c where c.id=case_id and c.user_id=(select auth.uid()))) with check (exists(select 1 from public.cases c where c.id=case_id and c.user_id=(select auth.uid())));
create policy sources_read on public.sources for select to authenticated using (approved_by_admin is not null);
create policy drafts_owner on public.drafts for all to authenticated using (exists(select 1 from public.cases c where c.id=case_id and c.user_id=(select auth.uid()))) with check (exists(select 1 from public.cases c where c.id=case_id and c.user_id=(select auth.uid())));
create policy communications_owner on public.communications for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy reminders_owner on public.reminders for all to authenticated using (exists(select 1 from public.cases c where c.id=case_id and c.user_id=(select auth.uid()))) with check (exists(select 1 from public.cases c where c.id=case_id and c.user_id=(select auth.uid())));
create policy audit_owner_read on public.audit_events for select to authenticated using ((select auth.uid())=user_id);

-- New Supabase projects no longer expose public tables automatically; grant only intended Data API privileges.
grant select,insert,update,delete on public.profiles,public.cases,public.documents,public.extracted_facts,public.evidence_claims,public.drafts,public.communications,public.reminders to authenticated;
grant select on public.sources,public.audit_events to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('case-documents','case-documents',false,10485760,array['application/pdf','image/jpeg','image/png','text/plain','message/rfc822'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Object paths are user_id/case_id/file. This makes ownership independently checkable at Storage RLS.
create policy case_documents_select on storage.objects for select to authenticated using (
 bucket_id='case-documents' and (storage.foldername(name))[1]=(select auth.uid())::text and
 exists(select 1 from public.cases c where c.id::text=(storage.foldername(name))[2] and c.user_id=(select auth.uid()))
);
create policy case_documents_insert on storage.objects for insert to authenticated with check (
 bucket_id='case-documents' and (storage.foldername(name))[1]=(select auth.uid())::text and
 exists(select 1 from public.cases c where c.id::text=(storage.foldername(name))[2] and c.user_id=(select auth.uid()))
);
create policy case_documents_update on storage.objects for update to authenticated using (
 bucket_id='case-documents' and (storage.foldername(name))[1]=(select auth.uid())::text and
 exists(select 1 from public.cases c where c.id::text=(storage.foldername(name))[2] and c.user_id=(select auth.uid()))
) with check (
 bucket_id='case-documents' and (storage.foldername(name))[1]=(select auth.uid())::text and
 exists(select 1 from public.cases c where c.id::text=(storage.foldername(name))[2] and c.user_id=(select auth.uid()))
);
create policy case_documents_delete on storage.objects for delete to authenticated using (
 bucket_id='case-documents' and (storage.foldername(name))[1]=(select auth.uid())::text and
 exists(select 1 from public.cases c where c.id::text=(storage.foldername(name))[2] and c.user_id=(select auth.uid()))
);
