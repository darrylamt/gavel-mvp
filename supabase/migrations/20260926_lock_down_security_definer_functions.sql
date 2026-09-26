-- Lock down SECURITY DEFINER functions that were executable by anon and
-- authenticated through PostgREST.
--
-- Postgres grants EXECUTE on new functions to PUBLIC by default. Earlier
-- migrations granted these to service_role but never revoked PUBLIC, so anyone
-- holding the public anon key could call them directly:
--
--   increment_referral_pending_earnings -- inflate own referral balance (paid out as cash)
--   finalize_referral_payout            -- rewrite referral payout state
--   increment_referral_counters         -- inflate referral counters
--   generate_referral_code              -- low impact, same pattern
--   admin_apply_global_buy_now_commission -- granted to authenticated with no
--                                          admin check inside; any user could
--                                          change the platform commission
--   process_shop_payment (both overloads) -- run shop payment processing
--   end_auction                         -- dashboard-only function with no callers
--                                          anywhere; ended any auction and set the
--                                          winner to the highest bid, ignoring reserve
--
-- Every caller in the web app uses the service-role key (verified 2026-09-26),
-- so nothing legitimate loses access.
--
-- Deliberately NOT touched: admin_review_seller_application. It is granted to
-- authenticated on purpose -- it enforces its own admin check and needs
-- auth.uid() for reviewed_by. See 20260817_restore_seller_role_writes.sql.

revoke execute on function public.increment_referral_pending_earnings(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.finalize_referral_payout(uuid, numeric)            from public, anon, authenticated;
revoke execute on function public.increment_referral_counters(uuid, boolean)         from public, anon, authenticated;
revoke execute on function public.generate_referral_code()                           from public, anon, authenticated;
revoke execute on function public.admin_apply_global_buy_now_commission(numeric)     from public, anon, authenticated;
revoke execute on function public.process_shop_payment(text, uuid, numeric, jsonb)   from public, anon, authenticated;
revoke execute on function public.process_shop_payment(text, uuid, numeric, jsonb, jsonb, text) from public, anon, authenticated;
revoke execute on function public.end_auction(uuid)                                  from public, anon, authenticated;

grant execute on function public.increment_referral_pending_earnings(uuid, numeric) to service_role;
grant execute on function public.finalize_referral_payout(uuid, numeric)            to service_role;
grant execute on function public.increment_referral_counters(uuid, boolean)         to service_role;
grant execute on function public.generate_referral_code()                           to service_role;
grant execute on function public.admin_apply_global_buy_now_commission(numeric)     to service_role;
grant execute on function public.process_shop_payment(text, uuid, numeric, jsonb)   to service_role;
grant execute on function public.process_shop_payment(text, uuid, numeric, jsonb, jsonb, text) to service_role;
grant execute on function public.end_auction(uuid)                                  to service_role;

-- Stop the same hole from reopening on functions created later.
alter default privileges in schema public revoke execute on functions from public;
