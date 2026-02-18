create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paystack_reference text not null unique,
  total_amount numeric(12,2) not null check (total_amount >= 0),
  status text not null default 'paid' check (status in ('paid', 'cancelled', 'refunded')),
  created_at timestamptz not null default now()
);

create index if not exists idx_shop_orders_user_id on public.shop_orders(user_id);
create index if not exists idx_shop_orders_created_at on public.shop_orders(created_at desc);

create table if not exists public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  product_id uuid not null references public.shop_products(id) on delete restrict,
  title_snapshot text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12,2) generated always as (unit_price * quantity) stored,
  created_at timestamptz not null default now()
);

create index if not exists idx_shop_order_items_order_id on public.shop_order_items(order_id);
create index if not exists idx_shop_order_items_product_id on public.shop_order_items(product_id);

create or replace function public.process_shop_payment(
  p_reference text,
  p_user_id uuid,
  p_total_amount numeric,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_title text;
  v_unit_price numeric;
  v_existing_stock integer;
  v_existing_status text;
begin
  if p_reference is null or btrim(p_reference) = '' then
    raise exception 'Missing payment reference';
  end if;

  if p_user_id is null then
    raise exception 'Missing user id';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Missing checkout items';
  end if;

  select id
    into v_order_id
  from public.shop_orders
  where paystack_reference = p_reference;

  if v_order_id is not null then
    return v_order_id;
  end if;

  insert into public.shop_orders (user_id, paystack_reference, total_amount, status)
  values (p_user_id, p_reference, p_total_amount, 'paid')
  returning id into v_order_id;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := greatest(1, (v_item->>'quantity')::integer);
    v_title := coalesce(v_item->>'title', 'Product');
    v_unit_price := coalesce((v_item->>'unit_price')::numeric, 0);

    if v_product_id is null then
      raise exception 'Invalid product id in checkout payload';
    end if;

    select stock, status
      into v_existing_stock, v_existing_status
    from public.shop_products
    where id = v_product_id
    for update;

    if not found then
      raise exception 'Product not found for checkout item %', v_product_id;
    end if;

    if v_existing_status <> 'active' then
      raise exception 'Product is not active for checkout';
    end if;

    if v_existing_stock < v_quantity then
      raise exception 'Insufficient stock for product %', v_product_id;
    end if;

    update public.shop_products
    set
      stock = stock - v_quantity,
      status = case
        when stock - v_quantity <= 0 then 'sold_out'
        when status = 'sold_out' then 'active'
        else status
      end
    where id = v_product_id;

    insert into public.shop_order_items (
      order_id,
      product_id,
      title_snapshot,
      unit_price,
      quantity
    )
    values (
      v_order_id,
      v_product_id,
      v_title,
      v_unit_price,
      v_quantity
    );
  end loop;

  return v_order_id;
end;
$$;

grant execute on function public.process_shop_payment(text, uuid, numeric, jsonb) to service_role;
