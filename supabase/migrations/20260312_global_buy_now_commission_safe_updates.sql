-- Ensure global commission RPC works when safe-update policies require a WHERE clause.
create or replace function public.admin_apply_global_buy_now_commission(p_commission numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commission numeric(5,2);
begin
  v_commission := round(p_commission::numeric, 2);

  if v_commission < 0 or v_commission > 10 then
    raise exception 'Commission must be between 0 and 10';
  end if;

  update public.platform_settings
  set buy_now_commission_percent = v_commission,
      updated_at = now()
  where id = 1;

  -- Recalculate all product listing prices from seller base price.
  update public.shop_products
  set
    seller_base_price = coalesce(
      seller_base_price,
      round(price / nullif(1 + coalesce(commission_rate, 10) / 100, 0), 2)
    ),
    commission_rate = v_commission,
    price = round(
      coalesce(
        seller_base_price,
        round(price / nullif(1 + coalesce(commission_rate, 10) / 100, 0), 2)
      ) * (1 + v_commission / 100),
      2
    ),
    updated_at = now()
  where true;

  -- Recalculate all variant listing prices from seller base price.
  update public.shop_product_variants
  set
    seller_base_price = coalesce(
      seller_base_price,
      round(price / nullif(1 + coalesce(commission_rate, 10) / 100, 0), 2)
    ),
    commission_rate = v_commission,
    price = round(
      coalesce(
        seller_base_price,
        round(price / nullif(1 + coalesce(commission_rate, 10) / 100, 0), 2)
      ) * (1 + v_commission / 100),
      2
    ),
    updated_at = now()
  where true;
end;
$$;

revoke all on function public.admin_apply_global_buy_now_commission(numeric) from public;
grant execute on function public.admin_apply_global_buy_now_commission(numeric) to authenticated;
