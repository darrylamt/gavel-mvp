-- Ensure the active_seller_shops view runs with caller permissions (avoid SECURITY DEFINER behavior)
alter view public.active_seller_shops set (security_invoker = true);
