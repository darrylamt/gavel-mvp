-- Let sellers read the delivery timeline for orders they are shipping.
--
-- delivery_events had a buyer policy and an admin policy, but none for sellers,
-- so a seller dispatching an order could not see its status — when a buyer
-- asked "where is my item?", the seller knew less than the buyer.
--
-- Shop orders only for now. The auction equivalent (joined through
-- auctions.seller_id) ships with the delivery_events.auction_id exclusive-arc
-- migration, since that column does not exist yet.

drop policy if exists "seller_read_shop_delivery_events" on public.delivery_events;
create policy "seller_read_shop_delivery_events" on public.delivery_events
  for select
  using (
    exists (
      select 1 from public.shop_order_items
      where shop_order_items.order_id = delivery_events.order_id
        and shop_order_items.seller_id = auth.uid()
    )
  );
