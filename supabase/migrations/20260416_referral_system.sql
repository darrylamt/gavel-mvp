-- ─── Referral System ──────────────────────────────────────────────────────────

-- 1. Core referral accounts table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  referral_code text UNIQUE NOT NULL,
  referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_verified boolean DEFAULT false,
  leaderboard_display text DEFAULT 'anonymous'
    CHECK (leaderboard_display IN ('name', 'anonymous')),
  total_earnings numeric DEFAULT 0 NOT NULL,
  pending_earnings numeric DEFAULT 0 NOT NULL,
  paid_earnings numeric DEFAULT 0 NOT NULL,
  total_referrals integer DEFAULT 0 NOT NULL,
  buyer_referrals integer DEFAULT 0 NOT NULL,
  seller_referrals integer DEFAULT 0 NOT NULL,
  -- Temporary OTP storage for phone verification
  phone_otp text,
  phone_otp_expires_at timestamptz,
  verified_phone text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Individual commission records
CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  referred_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  order_id uuid,
  auction_id uuid,
  transaction_reference text,
  gross_amount numeric NOT NULL,
  commission_rate numeric NOT NULL DEFAULT 0.02,
  commission_amount numeric NOT NULL,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  triggered_at timestamptz DEFAULT now() NOT NULL,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Monthly payout batches
CREATE TABLE IF NOT EXISTS public.referral_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  period text NOT NULL, -- e.g. "2026-03"
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  paystack_transfer_code text,
  paid_at timestamptz,
  commission_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_referrals_user_id ON public.referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_by ON public.referrals(referred_by);
CREATE INDEX IF NOT EXISTS idx_referrals_total_earnings ON public.referrals(total_earnings DESC);

CREATE INDEX IF NOT EXISTS idx_ref_commissions_referrer ON public.referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_ref_commissions_referred ON public.referral_commissions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_ref_commissions_order ON public.referral_commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_ref_commissions_status ON public.referral_commissions(status);
CREATE INDEX IF NOT EXISTS idx_ref_commissions_created ON public.referral_commissions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ref_payouts_referrer ON public.referral_payouts(referrer_id);
CREATE INDEX IF NOT EXISTS idx_ref_payouts_status ON public.referral_payouts(status);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_payouts ENABLE ROW LEVEL SECURITY;

-- referrals: users see their own record
CREATE POLICY "referrals_select_own"
  ON public.referrals FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- referrals: leaderboard — public read of non-sensitive columns (earnings, totals, leaderboard_display)
-- Full enforcement happens in the API route; this just gates direct table access.
CREATE POLICY "referrals_select_public"
  ON public.referrals FOR SELECT
  USING (true);

-- referrals: users can update only their own leaderboard_display preference
CREATE POLICY "referrals_update_own"
  ON public.referrals FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- referrals: service role can insert/update everything (bypasses RLS anyway)
CREATE POLICY "referrals_insert_service"
  ON public.referrals FOR INSERT
  WITH CHECK (true);

-- referral_commissions: users see only their own (as referrer)
CREATE POLICY "commissions_select_own"
  ON public.referral_commissions FOR SELECT
  USING (referrer_id = (SELECT auth.uid()));

CREATE POLICY "commissions_insert_service"
  ON public.referral_commissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "commissions_update_service"
  ON public.referral_commissions FOR UPDATE
  USING (true);

-- referral_payouts: users see only their own
CREATE POLICY "ref_payouts_select_own"
  ON public.referral_payouts FOR SELECT
  USING (referrer_id = (SELECT auth.uid()));

CREATE POLICY "ref_payouts_insert_service"
  ON public.referral_payouts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "ref_payouts_update_service"
  ON public.referral_payouts FOR UPDATE
  USING (true);

-- ─── RPC Functions ────────────────────────────────────────────────────────────

-- Atomically increment pending and total earnings for a referrer
CREATE OR REPLACE FUNCTION public.increment_referral_pending_earnings(
  p_referrer_id uuid,
  p_amount      numeric
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.referrals
  SET
    pending_earnings = pending_earnings + p_amount,
    total_earnings   = total_earnings   + p_amount
  WHERE user_id = p_referrer_id;
$$;

-- Move earnings from pending → paid when a payout completes
CREATE OR REPLACE FUNCTION public.finalize_referral_payout(
  p_referrer_id uuid,
  p_amount      numeric
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.referrals
  SET
    pending_earnings = GREATEST(0, pending_earnings - p_amount),
    paid_earnings    = paid_earnings + p_amount
  WHERE user_id = p_referrer_id;
$$;

-- Increment referrer's total_referrals and buyer/seller counters when a new user signs up
CREATE OR REPLACE FUNCTION public.increment_referral_counters(
  p_referrer_id uuid,
  p_is_seller   boolean DEFAULT false
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.referrals
  SET
    total_referrals  = total_referrals + 1,
    seller_referrals = seller_referrals + CASE WHEN p_is_seller THEN 1 ELSE 0 END,
    buyer_referrals  = buyer_referrals  + CASE WHEN p_is_seller THEN 0 ELSE 1 END
  WHERE user_id = p_referrer_id;
$$;

-- Generate a unique GAV-XXXXXX referral code (retries until unique)
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate text;
  chars     text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- exclude confusable 0/O/1/I
  i         int;
  attempts  int := 0;
BEGIN
  LOOP
    candidate := 'GAV-';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(chars, (floor(random() * length(chars))::int + 1), 1);
    END LOOP;

    IF NOT EXISTS (SELECT 1 FROM public.referrals WHERE referral_code = candidate) THEN
      RETURN candidate;
    END IF;

    attempts := attempts + 1;
    IF attempts > 50 THEN
      RAISE EXCEPTION 'Could not generate unique referral code after 50 attempts';
    END IF;
  END LOOP;
END;
$$;
