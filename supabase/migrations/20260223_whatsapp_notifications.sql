alter table public.profiles
  add column if not exists whatsapp_phone text,
  add column if not exists whatsapp_opt_in boolean not null default false,
  add column if not exists whatsapp_marketing_opt_in boolean not null default false,
  add column if not exists whatsapp_opt_in_at timestamptz,
  add column if not exists whatsapp_last_inbound_at timestamptz;

create table if not exists public.whatsapp_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  phone text not null,
  template_key text not null,
  template_params jsonb not null default '{}'::jsonb,
  category text not null check (category in ('transactional', 'security', 'marketing')),
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  reason text,
  provider_message_id text,
  dedupe_key text,
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists whatsapp_notifications_dedupe_key_uidx
  on public.whatsapp_notifications(dedupe_key)
  where dedupe_key is not null;

create index if not exists whatsapp_notifications_status_send_after_idx
  on public.whatsapp_notifications(status, send_after);

create index if not exists whatsapp_notifications_user_id_idx
  on public.whatsapp_notifications(user_id);

create or replace function public.set_whatsapp_notifications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists whatsapp_notifications_set_updated_at on public.whatsapp_notifications;
create trigger whatsapp_notifications_set_updated_at
before update on public.whatsapp_notifications
for each row execute function public.set_whatsapp_notifications_updated_at();
