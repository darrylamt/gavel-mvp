-- Remove WhatsApp columns from profiles
alter table public.profiles
  drop column if exists whatsapp_phone,
  drop column if exists whatsapp_opt_in,
  drop column if exists whatsapp_marketing_opt_in,
  drop column if exists whatsapp_opt_in_at,
  drop column if exists whatsapp_last_inbound_at;

-- Add SMS notification columns to profiles
alter table public.profiles
  add column if not exists sms_opt_in boolean not null default true,
  add column if not exists sms_marketing_opt_in boolean not null default true,
  add column if not exists sms_opt_in_at timestamptz,
  add column if not exists sms_last_inbound_at timestamptz;

-- Drop old WhatsApp tables and triggers
drop trigger if exists whatsapp_notifications_set_updated_at on public.whatsapp_notifications;
drop function if exists public.set_whatsapp_notifications_updated_at();
drop table if exists public.whatsapp_notifications;

-- Create SMS notifications table
create table if not exists public.sms_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  phone text not null,
  message text not null,
  category text not null check (category in ('transactional', 'security', 'marketing')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  reason text,
  provider_message_id text,
  dedupe_key text,
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for SMS notifications
create unique index if not exists sms_notifications_dedupe_key_uidx
  on public.sms_notifications(dedupe_key)
  where dedupe_key is not null;

create index if not exists sms_notifications_status_send_after_idx
  on public.sms_notifications(status, send_after);

create index if not exists sms_notifications_user_id_idx
  on public.sms_notifications(user_id);

-- Create function for updating SMS notifications timestamp
create or replace function public.set_sms_notifications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create trigger for SMS notifications
drop trigger if exists sms_notifications_set_updated_at on public.sms_notifications;
create trigger sms_notifications_set_updated_at
before update on public.sms_notifications
for each row execute function public.set_sms_notifications_updated_at();
