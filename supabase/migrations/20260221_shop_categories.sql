create table if not exists public.shop_categories (
  id bigserial primary key,
  name text not null unique,
  slug text not null unique,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.shop_categories (name, slug, description, image_url, sort_order, is_active)
values
  ('Electronics', 'electronics', 'Phones, gadgets, smart devices', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80', 1, true),
  ('Home Appliances', 'home-appliances', 'Kitchen and everyday essentials', 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80', 2, true),
  ('Vehicles', 'vehicles', 'Cars, bikes and accessories', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80', 3, true),
  ('Fashion', 'fashion', 'Clothing, shoes and lifestyle', 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=80', 4, true),
  ('Furniture', 'furniture', 'Living room and office pieces', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80', 5, true),
  ('Collectibles', 'collectibles', 'Unique finds and rare items', 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=900&q=80', 6, true),
  ('Other', 'other', 'General products', 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=900&q=80', 99, true)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

alter table public.shop_products
  drop constraint if exists shop_products_category_check;

update public.shop_products
set category = case
  when category = 'For Home' then 'Home Appliances'
  when category in ('For Audio', 'For Mobile') then 'Electronics'
  when category = 'Accessories' then 'Other'
  when category is null or btrim(category) = '' then 'Other'
  else category
end;

update public.shop_products p
set category = 'Other'
where not exists (
  select 1
  from public.shop_categories c
  where c.is_active = true
    and c.name = p.category
);

alter table public.shop_products
  add constraint shop_products_category_check
  check (category in ('Electronics', 'Home Appliances', 'Vehicles', 'Fashion', 'Furniture', 'Collectibles', 'Other'));
