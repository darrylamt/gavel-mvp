-- Ensure shop checkout order creation satisfies tracking constraints on newer schemas.

alter table public.shop_orders
  add column if not exists tracking_number text,
  add column if not exists tracking_status text not null default 'pending',
  add column if not exists tracking_history jsonb not null default '[]'::jsonb;

update public.shop_orders
set tracking_number = concat('GVL', lpad(substring(replace(id::text, '-', ''), 1, 12), 12, '0'))
where tracking_number is null;

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
  when duplicate_object then null;
end $$;

create index if not exists idx_shop_orders_tracking_number on public.shop_orders(tracking_number);
create index if not exists idx_shop_orders_tracking_status on public.shop_orders(tracking_status);

create or replace function public.process_shop_payment(
  p_reference text,
  p_user_id uuid,
  p_total_amount numeric,
  p_items jsonb,
  p_delivery jsonb default '{}'::jsonb,
  p_buyer_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_tracking_number text;
  v_item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_variant_product_id uuid;
  v_variant_stock integer;
  v_variant_active boolean;
  v_quantity integer;
  v_title text;
  v_unit_price numeric;
  v_existing_stock integer;
  v_existing_status text;
  v_delivery_name text;
  v_delivery_phone text;
  v_delivery_address text;
  v_delivery_city text;
  v_delivery_notes text;
  v_seller_id uuid;
  v_seller_name text;
  v_seller_phone text;
  v_seller_shop_name text;
  v_seller_account_name text;
  v_seller_account_number text;
  v_seller_provider text;
  v_variant_label text;
  v_has_email_column boolean;
  v_has_buyer_email_column boolean;
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

  v_delivery_name := nullif(btrim(coalesce(p_delivery->>'full_name', '')), '');
  v_delivery_phone := nullif(btrim(coalesce(p_delivery->>'phone', '')), '');
  v_delivery_address := nullif(btrim(coalesce(p_delivery->>'address', '')), '');
  v_delivery_city := nullif(btrim(coalesce(p_delivery->>'city', '')), '');
  v_delivery_notes := nullif(btrim(coalesce(p_delivery->>'notes', '')), '');

  select exists(
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'shop_orders'
      and column_name = 'email'
  ) into v_has_email_column;

  select exists(
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'shop_orders'
      and column_name = 'buyer_email'
  ) into v_has_buyer_email_column;

  select id
    into v_order_id
  from public.shop_orders
  where paystack_reference = p_reference;

  if v_order_id is not null then
    return v_order_id;
  end if;

  v_order_id := gen_random_uuid();
  v_tracking_number := concat('GVL', lpad(substring(replace(v_order_id::text, '-', ''), 1, 12), 12, '0'));

  if v_has_email_column and v_has_buyer_email_column then
    execute '
      insert into public.shop_orders (
        id,
        user_id,
        paystack_reference,
        total_amount,
        status,
        tracking_number,
        email,
        buyer_email,
        buyer_full_name,
        buyer_phone,
        delivery_address,
        delivery_city,
        delivery_notes
      )
      values ($1, $2, $3, $4, ''paid'', $5, $6, $6, $7, $8, $9, $10, $11)
    '
    using v_order_id,
      p_user_id,
      p_reference,
      p_total_amount,
      v_tracking_number,
      nullif(btrim(coalesce(p_buyer_email, '')), ''),
      v_delivery_name,
      v_delivery_phone,
      v_delivery_address,
      v_delivery_city,
      v_delivery_notes;
  elsif v_has_email_column then
    execute '
      insert into public.shop_orders (
        id,
        user_id,
        paystack_reference,
        total_amount,
        status,
        tracking_number,
        email,
        buyer_full_name,
        buyer_phone,
        delivery_address,
        delivery_city,
        delivery_notes
      )
      values ($1, $2, $3, $4, ''paid'', $5, $6, $7, $8, $9, $10, $11)
    '
    using v_order_id,
      p_user_id,
      p_reference,
      p_total_amount,
      v_tracking_number,
      nullif(btrim(coalesce(p_buyer_email, '')), ''),
      v_delivery_name,
      v_delivery_phone,
      v_delivery_address,
      v_delivery_city,
      v_delivery_notes;
  else
    insert into public.shop_orders (
      id,
      user_id,
      paystack_reference,
      total_amount,
      status,
      tracking_number,
      buyer_email,
      buyer_full_name,
      buyer_phone,
      delivery_address,
      delivery_city,
      delivery_notes
    )
    values (
      v_order_id,
      p_user_id,
      p_reference,
      p_total_amount,
      'paid',
      v_tracking_number,
      nullif(btrim(coalesce(p_buyer_email, '')), ''),
      v_delivery_name,
      v_delivery_phone,
      v_delivery_address,
      v_delivery_city,
      v_delivery_notes
    );
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_variant_id := nullif(v_item->>'variant_id', '')::uuid;
    v_quantity := greatest(1, coalesce((v_item->>'quantity')::integer, 1));
    v_title := coalesce(v_item->>'title', 'Product');
    v_unit_price := coalesce((v_item->>'unit_price')::numeric, 0);
    v_variant_label := nullif(btrim(coalesce(v_item->>'variant_label', '')), '');

    v_seller_id := nullif(v_item->>'seller_id', '')::uuid;
    v_seller_name := nullif(btrim(coalesce(v_item->>'seller_name', '')), '');
    v_seller_phone := nullif(btrim(coalesce(v_item->>'seller_phone', '')), '');
    v_seller_shop_name := nullif(btrim(coalesce(v_item->>'seller_shop_name', '')), '');
    v_seller_account_name := nullif(btrim(coalesce(v_item->>'seller_payout_account_name', '')), '');
    v_seller_account_number := nullif(btrim(coalesce(v_item->>'seller_payout_account_number', '')), '');
    v_seller_provider := nullif(btrim(coalesce(v_item->>'seller_payout_provider', '')), '');

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

    if v_variant_id is not null then
      select product_id, stock, is_active
        into v_variant_product_id, v_variant_stock, v_variant_active
      from public.shop_product_variants
      where id = v_variant_id
      for update;

      if not found then
        raise exception 'Variant not found for checkout item %', v_variant_id;
      end if;

      if v_variant_product_id <> v_product_id then
        raise exception 'Variant does not belong to product %', v_product_id;
      end if;

      if coalesce(v_variant_active, false) = false then
        raise exception 'Variant is not active for checkout';
      end if;

      if coalesce(v_variant_stock, 0) < v_quantity then
        raise exception 'Insufficient stock for variant %', v_variant_id;
      end if;

      update public.shop_product_variants
      set stock = stock - v_quantity
      where id = v_variant_id;
    else
      if coalesce(v_existing_stock, 0) < v_quantity then
        raise exception 'Insufficient stock for product %', v_product_id;
      end if;

      update public.shop_products
      set stock = stock - v_quantity
      where id = v_product_id;
    end if;

    update public.shop_products
    set status = case
      when stock <= 0 then 'sold_out'
      when status = 'sold_out' and stock > 0 then 'active'
      else status
    end
    where id = v_product_id;

    insert into public.shop_order_items (
      order_id,
      product_id,
      variant_id,
      variant_label,
      title_snapshot,
      unit_price,
      quantity,
      seller_id,
      seller_name,
      seller_phone,
      seller_shop_name,
      seller_payout_account_name,
      seller_payout_account_number,
      seller_payout_provider
    )
    values (
      v_order_id,
      v_product_id,
      v_variant_id,
      v_variant_label,
      v_title,
      v_unit_price,
      v_quantity,
      v_seller_id,
      v_seller_name,
      v_seller_phone,
      v_seller_shop_name,
      v_seller_account_name,
      v_seller_account_number,
      v_seller_provider
    );
  end loop;

  return v_order_id;
end;
$$;

grant execute on function public.process_shop_payment(text, uuid, numeric, jsonb, jsonb, text) to service_role;