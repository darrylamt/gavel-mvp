alter table public.shop_product_reviews
  alter column status set default 'pending';

alter table public.shop_product_reviews
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists rejection_reason text;

create index if not exists idx_shop_product_reviews_status_created
  on public.shop_product_reviews(status, created_at desc);
