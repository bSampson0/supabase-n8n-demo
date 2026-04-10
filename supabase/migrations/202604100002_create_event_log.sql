-- Create event_log table to track all GitHub and Netlify events
create table if not exists public.event_log (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('github_push', 'github_pr', 'github_issue', 'netlify_deploy', 'custom')),
  event_source text not null, -- 'github' or 'netlify'
  event_action text, -- e.g., 'opened', 'closed', 'merged', 'building', 'ready'

  -- GitHub specific
  repo_name text,
  branch text,
  commit_sha text,
  commit_message text,
  author text,
  pr_number integer,
  pr_title text,
  issue_number integer,
  issue_title text,

  -- Netlify specific
  deploy_id text,
  deploy_url text,
  deploy_state text, -- 'building', 'ready', 'error'
  site_name text,

  -- Metadata
  payload jsonb, -- Store full webhook payload for debugging
  created_at timestamptz not null default now()
);

create index if not exists event_log_created_at_idx
  on public.event_log (created_at desc);

create index if not exists event_log_event_type_idx
  on public.event_log (event_type);

create index if not exists event_log_repo_name_idx
  on public.event_log (repo_name);

alter table public.event_log enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_log'
      and policyname = 'Authenticated users can read event_log'
  ) then
    create policy "Authenticated users can read event_log"
      on public.event_log
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_log'
      and policyname = 'Service role can insert event_log'
  ) then
    create policy "Service role can insert event_log"
      on public.event_log
      for insert
      to service_role
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'event_log'
  ) then
    alter publication supabase_realtime add table public.event_log;
  end if;
end $$;
