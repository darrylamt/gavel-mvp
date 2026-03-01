create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  percent_off numeric(5,2) not null check (percent_off > 0 and percent_off <= 100),
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_discount_codes_code on public.discount_codes(code);
create index if not exists idx_discount_codes_active on public.discount_codes(is_active);

create table if not exists public.discount_code_usages (
  id uuid primary key default gen_random_uuid(),
  discount_code_id uuid not null references public.discount_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  paystack_reference text not null unique,
  shop_order_id uuid references public.shop_orders(id) on delete set null,
  discount_amount numeric(12,2) not null default 0,
  order_subtotal numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_discount_code_usages_discount_code_id on public.discount_code_usages(discount_code_id);
create index if not exists idx_discount_code_usages_user_id on public.discount_code_usages(user_id);

alter table public.shop_orders
  add column if not exists discount_code text,
  add column if not exists discount_percent numeric(5,2),
  add column if not exists discount_amount numeric(12,2) not null default 0;

create or replace function public.set_discount_codes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_discount_codes_updated_at on public.discount_codes;
create trigger trg_set_discount_codes_updated_at
before update on public.discount_codes
for each row execute function public.set_discount_codes_updated_at();