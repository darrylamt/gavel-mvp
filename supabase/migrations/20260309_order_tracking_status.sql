-- Add order tracking status fields
-- This enables order tracking with status updates and history
-- Integrates with payout escrow: seller confirming delivery reduces hold from 5 days to 3 days
alter table public.shop_orders
  add column if not exists tracking_number text,
  add column if not exists tracking_status text not null default 'pending' 
    check (tracking_status in ('pending', 'confirmed', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled')),
  add column if not exists tracking_history jsonb not null default '[]'::jsonb,
  add column if not exists delivery_address text,
  add column if not exists estimated_delivery_date timestamptz,
  add column if not exists actual_delivery_date timestamptz;

-- Generate tracking numbers for existing orders
update public.shop_orders
set tracking_number = concat('GVL', lpad(substring(id::text, 1, 12), 12, '0'))
where tracking_number is null;

-- Make tracking_number NOT NULL after populating existing records
-- Only add constraint if it doesn't already exist
do $$
begin
  alter table public.shop_orders
    alter column tracking_number set not null;
exception
  when others then null;
end $$;

do $$
begin
  alter table public.shop_orders
    add constraint unique_tracking_number unique (tracking_number);
exception
  when duplicate_table then null;
end $$;

create index if not exists idx_shop_orders_tracking_number on public.shop_orders(tracking_number);
create index if not exists idx_shop_orders_tracking_status on public.shop_orders(tracking_status);

-- Add seller info to shop_order_items for easier tracking
alter table public.shop_order_items
  add column if not exists seller_id uuid references public.profiles(id),
  add column if not exists seller_name text,
  add column if not exists seller_phone text,
  add column if not exists seller_tracking_status text not null default 'pending'
    check (seller_tracking_status in ('pending', 'confirmed', 'picked_up', 'in_transit', 'delivered'));

create index if not exists idx_shop_order_items_seller_id on public.shop_order_items(seller_id);
create index if not exists idx_shop_order_items_seller_tracking on public.shop_order_items(seller_id, seller_tracking_status);

-- Function to add tracking history entry
create or replace function public.add_tracking_history(
  p_order_id uuid,
  p_status text,
  p_description text,
  p_location text default null,
  p_updated_by uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_history jsonb;
begin
  select tracking_history into v_history
  from shop_orders
  where id = p_order_id;

  -- Add new entry to history
  v_history := v_history || jsonb_build_object(
    'status', p_status,
    'description', p_description,
    'location', p_location,
    'timestamp', now(),
    'updated_by', p_updated_by
  );

  -- Update order with new status and history
  update shop_orders
  set 
    tracking_status = p_status,
    tracking_history = v_history,
    actual_delivery_date = case when p_status = 'delivered' then now() else actual_delivery_date end
  where id = p_order_id;
end;
$$;
