-- Add shipping_profile_id to shop_products table
alter table public.shop_products
add column if not exists shipping_profile_id uuid references public.shipping_profiles(id) on delete set null;

-- Create index for better query performance
create index if not exists idx_shop_products_shipping_profile_id 
  on public.shop_products(shipping_profile_id);
