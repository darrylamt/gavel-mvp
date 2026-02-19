create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'replied', 'archived')),
  user_id uuid references auth.users(id) on delete set null,
  source text not null default 'contact_page',
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_messages_created_at
  on public.contact_messages (created_at desc);

create index if not exists idx_contact_messages_status
  on public.contact_messages (status);

alter table public.contact_messages enable row level security;

drop policy if exists "No direct access to contact_messages" on public.contact_messages;
create policy "No direct access to contact_messages"
  on public.contact_messages
  for all
  using (false)
  with check (false);
