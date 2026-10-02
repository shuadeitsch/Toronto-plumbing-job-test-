-- Ellison & Co. job book — run once in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  source text check (source in ('Instagram', 'Neighbor', 'Repeat', 'Referral', 'Other')),
  follow_up_on date,
  follow_up_note text,
  created_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  address text,
  room text not null,
  quote numeric(10, 2),
  quoted_on date,
  wanted_on date,
  stage text not null default 'new'
    check (stage in ('new', 'quoted', 'booked', 'in_progress', 'done', 'lost')),
  notes text not null default '',
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  stage_changed_at timestamptz not null default now()
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  kind text not null check (kind in ('note', 'reached_out', 'heard_back', 'stage')),
  body text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists jobs_contact_idx on jobs (contact_id);
create index if not exists jobs_stage_idx on jobs (stage);
create index if not exists activities_contact_idx on activities (contact_id, created_at desc);

-- Lock everything down. The app talks to the database from its own server
-- with the service-role key; nobody can read these tables with the public key.
alter table contacts enable row level security;
alter table jobs enable row level security;
alter table activities enable row level security;
