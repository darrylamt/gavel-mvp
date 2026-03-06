-- Add SMS notification preference columns to profiles table
-- All default to true so users get notifications by default

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS sms_auction_countdown_10h boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_auction_countdown_5h boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_auction_countdown_1h boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_auction_countdown_30m boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_auction_countdown_5m boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_bid_updates boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_auction_won boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_outbid boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_payment_reminders boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_shipping_updates boolean DEFAULT true;

-- Add comment explaining these columns
COMMENT ON COLUMN public.profiles.sms_auction_countdown_10h IS 'Receive SMS when auction ends in 10 hours (bidders only)';
COMMENT ON COLUMN public.profiles.sms_auction_countdown_5h IS 'Receive SMS when auction ends in 5 hours (bidders only)';
COMMENT ON COLUMN public.profiles.sms_auction_countdown_1h IS 'Receive SMS when auction ends in 1 hour (bidders only)';
COMMENT ON COLUMN public.profiles.sms_auction_countdown_30m IS 'Receive SMS when auction ends in 30 minutes (bidders only)';
COMMENT ON COLUMN public.profiles.sms_auction_countdown_5m IS 'Receive SMS when auction ends in 5 minutes (bidders only)';
COMMENT ON COLUMN public.profiles.sms_bid_updates IS 'Receive SMS for bid confirmations and updates';
COMMENT ON COLUMN public.profiles.sms_auction_won IS 'Receive SMS when you win an auction';
COMMENT ON COLUMN public.profiles.sms_outbid IS 'Receive SMS when someone outbids you';
COMMENT ON COLUMN public.profiles.sms_payment_reminders IS 'Receive SMS payment reminders for won auctions';
COMMENT ON COLUMN public.profiles.sms_shipping_updates IS 'Receive SMS shipping and delivery updates';
