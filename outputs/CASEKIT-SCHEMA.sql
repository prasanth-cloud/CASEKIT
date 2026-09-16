-- CaseKit initial Supabase/Postgres schema
-- Scope: U.S. online-purchase complaints, one user owns their cases and documents.
-- All mutable production tables use RLS. Keep the storage bucket private.

create extension if not exists pgcrypto;

create type public.case_issue_type as enum (
  'missing_delivery',
  'damaged_item',
  'refund_not_received',
  'duplicate_charge',
  'return_rejected',
  'cancelled_order',
  'poor_service'
);

create type public.case_status as enum (
  'draft',
  'processing',
  'needs_review',
  'draft_ready',
  'approved',
  'waiting_for_response',
  'resolved',
  'closed',
  'blocked'
);

create type public.document_status as enum (
  'uploaded',
  'scanning',
  'ready',
  'failed',
  'deleted'
);

create type public.draft_status as enum (
  'generated',
  'edited',
  'approved',
  'sent',
  'archived'
);

create type public.communication_direction as enum ('incoming', 'outgoing');

create type public.reminder_status as enum ('scheduled', 'sent', 'dismissed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  country text not null default 'US' check (country = 'US'),
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  merchant_name text,
  issue_type public.case_issue_type,
  jurisdiction text not null default 'US',
  status public.case_status not null default 'draft',
  desired_resolution text,
  confidence_score numeric(4,3) check (confidence_score between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  check (jurisdiction = 'US')
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  file_type text not null check (file_type in ('application/pdf', 'image/jpeg', 'image/png', 'text/plain', 'message/rfc822')),
  file_hash text not null,
  byte_size bigint not null check (byte_size > 0 and byte_size <= 10485760),
  status public.document_status not null default 'uploaded',
  redaction_status text not null default 'pending' check (redaction_status in ('pending', 'complete', 'failed', 'not_required')),
  retention_until timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (case_id, file_hash)
);

create table public.extracted_facts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  merchant text,
  order_id text,
  order_date date,
  item_description text,
  amount_paid numeric(12,2) check (amount_paid is null or amount_paid >= 0),
  delivery_date date,
  promised_date date,
  issue_type public.case_issue_type,
  problem_description text,
  customer_request text,
  missing_information jsonb not null default '[]'::jsonb,
  confidence numeric(4,3) check (confidence between 0 and 1),
  source_document_ids uuid[] not null default '{}',
  schema_version text not null,
  extracted_by text not null default 'ai',
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  unique (case_id, version)
);

create unique index extracted_facts_one_current_per_case
  on public.extracted_facts(case_id) where is_current;

create table public.evidence_claims (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  claim_text text not null,
  document_id uuid references public.documents(id) on delete set null,
  source_reference jsonb not null,
  confidence numeric(4,3) check (confidence between 0 and 1),
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  merchant_name text not null,
  source_url text not null,
  source_type text not null check (source_type in ('official_policy', 'official_contact', 'approved_help')),
  content text,
  fetched_at timestamptz,
  approved_by_admin uuid references public.profiles(id) on delete set null,
  content_hash text,
  created_at timestamptz not null default now(),
  unique (merchant_name, source_url)
);

create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  facts_version integer not null,
  subject text not null,
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  evidence_claim_ids uuid[] not null default '{}',
  safety_result jsonb not null,
  prompt_version text not null,
  status public.draft_status not null default 'generated',
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.communications (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  direction public.communication_direction not null,
  channel text not null check (channel in ('email', 'support_inbox', 'manual_note')),
  message_id text,
  content text not null,
  received_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('follow_up', 'retention_expiry', 'review_needed')),
  due_at timestamptz not null,
  status public.reminder_status not null default 'scheduled',
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  case_id uuid references public.cases(id) on delete set null,
  actor_type text not null check (actor_type in ('user', 'ai', 'admin', 'system')),
  action text not null,
  changes jsonb not null default '{}'::jsonb,
  prompt_version text,
  supporting_document_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index cases_by_user_created_at on public.cases(user_id, created_at desc);
create index documents_by_case on public.documents(case_id, created_at desc);
create index evidence_claims_by_case on public.evidence_claims(case_id, created_at desc);
create index reminders_due on public.reminders(status, due_at);
create index audit_events_by_case on public.audit_events(case_id, created_at desc);

-- Generic updated_at trigger for mutable user-facing rows.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create trigger cases_set_updated_at before update on public.cases
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.documents enable row level security;
alter table public.extracted_facts enable row level security;
alter table public.evidence_claims enable row level security;
alter table public.sources enable row level security;
alter table public.drafts enable row level security;
alter table public.communications enable row level security;
alter table public.reminders enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_self on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy cases_owner on public.cases
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy documents_owner on public.documents
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy extracted_facts_case_owner on public.extracted_facts
  for all using (exists (select 1 from public.cases c where c.id = case_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.cases c where c.id = case_id and c.user_id = auth.uid()));

create policy evidence_claims_case_owner on public.evidence_claims
  for all using (exists (select 1 from public.cases c where c.id = case_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.cases c where c.id = case_id and c.user_id = auth.uid()));

-- Sources are read-only to customers; admin writes should use a server-side role.
create policy sources_authenticated_read on public.sources
  for select to authenticated using (approved_by_admin is not null);

create policy drafts_case_owner on public.drafts
  for all using (exists (select 1 from public.cases c where c.id = case_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.cases c where c.id = case_id and c.user_id = auth.uid()));

create policy communications_owner on public.communications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy reminders_case_owner on public.reminders
  for all using (exists (select 1 from public.cases c where c.id = case_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.cases c where c.id = case_id and c.user_id = auth.uid()));

create policy audit_events_owner_read on public.audit_events
  for select using (user_id = auth.uid());

-- Create a private Storage bucket named `case-documents` separately. Its object
-- policies must require auth.uid() = owner metadata and a case owned by auth.uid().
-- Never make this bucket public.

