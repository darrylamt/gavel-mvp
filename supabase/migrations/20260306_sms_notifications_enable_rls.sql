-- Enable RLS for sms_notifications to satisfy Supabase security linting.
alter table public.sms_notifications enable row level security;

-- Keep direct client writes blocked; only users can read their own rows if needed.
drop policy if exists "Users can view own sms notifications" on public.sms_notifications;
create policy "Users can view own sms notifications"
  on public.sms_notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Explicitly block client inserts/updates/deletes.
drop policy if exists "No client insert on sms notifications" on public.sms_notifications;
create policy "No client insert on sms notifications"
  on public.sms_notifications
  for insert
  to authenticated
  with check (false);

drop policy if exists "No client update on sms notifications" on public.sms_notifications;
create policy "No client update on sms notifications"
  on public.sms_notifications
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists "No client delete on sms notifications" on public.sms_notifications;
create policy "No client delete on sms notifications"
  on public.sms_notifications
  for delete
  to authenticated
  using (false);
