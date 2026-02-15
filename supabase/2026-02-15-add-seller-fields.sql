alter table public.auctions
  add column if not exists sale_source text not null default 'gavel',
  add column if not exists seller_name text,
  add column if not exists seller_phone text,
  add column if not exists seller_expected_amount numeric(12,2),
  add column if not exists gavel_fee_percent numeric(5,2) not null default 10.00;

alter table public.auctions
  drop constraint if exists auctions_sale_source_check;

alter table public.auctions
  add constraint auctions_sale_source_check
  check (sale_source in ('gavel', 'seller'));

create index if not exists idx_auctions_sale_source
  on public.auctions (sale_source);

create index if not exists idx_auctions_seller_phone
  on public.auctions (seller_phone);

comment on column public.auctions.sale_source is 'Who is selling the item: gavel or external seller';
comment on column public.auctions.seller_name is 'Name of external seller when sale_source = seller';
comment on column public.auctions.seller_phone is 'Phone number of external seller when sale_source = seller';
comment on column public.auctions.seller_expected_amount is 'Amount seller wants before Gavel fee';
comment on column public.auctions.gavel_fee_percent is 'Fee percentage added to seller expected amount';
