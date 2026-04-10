create extension if not exists pgcrypto;

create table if not exists public.deployments (
  id uuid primary key default gen_random_uuid(),
  service text not null,
  version text not null,
  environment text not null,
  status text not null check (status in ('success', 'failed', 'running', 'pending')),
  triggered_by text not null,
  deployed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists deployments_deployed_at_idx
  on public.deployments (deployed_at desc);

alter table public.deployments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'deployments'
      and policyname = 'Authenticated users can read deployments'
  ) then
    create policy "Authenticated users can read deployments"
      on public.deployments
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'deployments'
      and policyname = 'Authenticated users can insert deployments'
  ) then
    create policy "Authenticated users can insert deployments"
      on public.deployments
      for insert
      to authenticated
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
      and tablename = 'deployments'
  ) then
    alter publication supabase_realtime add table public.deployments;
  end if;
end $$;

insert into public.deployments (service, version, environment, status, triggered_by, deployed_at)
values
  ('api-gateway', 'v2.4.1', 'production', 'success', 'github-actions', now() - interval '2 hours'),
  ('auth-service', 'v1.9.0', 'production', 'success', 'manuel@devops.io', now() - interval '3 hours'),
  ('data-pipeline', 'v3.1.2', 'staging', 'failed', 'github-actions', now() - interval '12 hours')
on conflict do nothing;