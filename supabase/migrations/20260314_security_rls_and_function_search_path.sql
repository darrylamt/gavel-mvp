-- Enable RLS on platform settings (public schema table exposed to PostgREST).
alter table public.platform_settings enable row level security;

-- Keep policy names stable across reruns.
drop policy if exists "Admins can read platform settings" on public.platform_settings;
drop policy if exists "Admins can modify platform settings" on public.platform_settings;

create policy "Admins can read platform settings"
  on public.platform_settings
  for select
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );

create policy "Admins can modify platform settings"
  on public.platform_settings
  for all
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );

-- Lock function search_path to satisfy linter and avoid role-mutable resolution.
alter function public.normalize_profile_starter_tokens() set search_path = public;
alter function public.update_payouts_updated_at() set search_path = public;
alter function public.set_sms_notifications_updated_at() set search_path = public;
alter function public.search_listings(vector, double precision, integer) set search_path = public, extensions;
