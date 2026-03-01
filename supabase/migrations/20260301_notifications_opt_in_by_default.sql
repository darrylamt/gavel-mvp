-- Change default notification preferences to opt-in (enabled by default)
-- Users can opt-out later in settings

-- Update whatsapp notification defaults to true
alter table public.profiles
  alter column whatsapp_opt_in set default true,
  alter column whatsapp_marketing_opt_in set default true;

-- Backfill existing users to have notifications enabled
-- (only for users who haven't explicitly set preferences yet)
update public.profiles
set 
  whatsapp_opt_in = true,
  whatsapp_marketing_opt_in = true
where 
  whatsapp_opt_in_at is null  -- Only update users who haven't set preferences yet
  and whatsapp_opt_in = false;
