create table if not exists public.shop_product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.shop_products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  reviewer_name text,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text,
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shop_product_reviews_product_status_created
  on public.shop_product_reviews(product_id, status, created_at desc);

alter table public.shop_product_reviews enable row level security;

-- Public can read approved reviews for storefront/schema
drop policy if exists "Public can read approved shop product reviews" on public.shop_product_reviews;
create policy "Public can read approved shop product reviews"
  on public.shop_product_reviews
  for select
  using (status = 'approved');

-- Authenticated users can create their own reviews
drop policy if exists "Users can insert own shop product reviews" on public.shop_product_reviews;
create policy "Users can insert own shop product reviews"
  on public.shop_product_reviews
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can update/delete their own reviews while pending
drop policy if exists "Users can update own pending shop product reviews" on public.shop_product_reviews;
create policy "Users can update own pending shop product reviews"
  on public.shop_product_reviews
  for update
  to authenticated
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own pending shop product reviews" on public.shop_product_reviews;
create policy "Users can delete own pending shop product reviews"
  on public.shop_product_reviews
  for delete
  to authenticated
  using (auth.uid() = user_id and status = 'pending');
