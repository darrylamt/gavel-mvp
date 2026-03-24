-- Phone Swap Feature Migration
-- Tables for Gavel's phone trade-in and upgrade service

-- Phone model configurations
CREATE TABLE swap_phone_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  model text NOT NULL,
  release_year integer NOT NULL,
  back_material text NOT NULL CHECK (back_material IN ('glass', 'plastic', 'metal', 'ceramic')),
  rear_cameras jsonb NOT NULL DEFAULT '[]',
  biometric text NOT NULL CHECK (biometric IN ('faceID', 'fingerprint', 'both', 'none')),
  water_resistance_rating text,
  has_back_glass boolean GENERATED ALWAYS AS (back_material = 'glass') STORED,
  base_trade_in_value numeric NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Deduction rates per phone model
CREATE TABLE swap_deduction_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid REFERENCES swap_phone_models(id) ON DELETE CASCADE,
  screen_replacement_cost numeric DEFAULT 0,
  screen_replaced_fixed_deduction numeric DEFAULT 0,
  back_glass_replacement_cost numeric DEFAULT 0,
  back_glass_replaced_fixed_deduction numeric DEFAULT 0,
  battery_deduction_per_percent numeric DEFAULT 0,
  battery_replaced_fixed_deduction numeric DEFAULT 0,
  camera_glass_cracked_deduction numeric DEFAULT 0,
  front_camera_deduction numeric DEFAULT 0,
  rear_camera_deduction_per_camera numeric DEFAULT 0,
  face_id_deduction numeric DEFAULT 0,
  fingerprint_deduction numeric DEFAULT 0,
  minor_scratches_deduction numeric DEFAULT 0,
  dents_deduction numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Available upgrade phones inventory
CREATE TABLE swap_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid REFERENCES swap_phone_models(id),
  storage text NOT NULL,
  color text NOT NULL,
  condition text NOT NULL CHECK (condition IN ('new', 'used_excellent', 'used_good', 'used_fair')),
  price numeric NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Swap submissions
CREATE TABLE swap_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,

  -- Phone being traded in
  model_id uuid REFERENCES swap_phone_models(id),
  storage text NOT NULL,
  color text NOT NULL,

  -- Battery
  battery_health integer NOT NULL,
  battery_replaced boolean DEFAULT false,

  -- Screen
  screen_condition text NOT NULL CHECK (screen_condition IN ('perfect', 'minor_scratches', 'cracked')),
  screen_replaced boolean DEFAULT false,

  -- Back glass (nullable — not all phones have back glass)
  back_glass_condition text CHECK (back_glass_condition IN ('perfect', 'minor_scratches', 'cracked')),
  back_glass_replaced boolean,

  -- Cameras
  camera_glass_cracked boolean DEFAULT false,
  front_camera_working boolean DEFAULT true,
  rear_cameras_status jsonb DEFAULT '{}',

  -- Biometrics
  face_id_working boolean,
  fingerprint_working boolean,

  -- Body
  body_condition text NOT NULL CHECK (body_condition IN ('perfect', 'minor_scratches', 'dented')),

  -- Other
  other_issues text,
  water_damage boolean DEFAULT false,

  -- Photos
  photos jsonb NOT NULL DEFAULT '[]',
  battery_health_screenshot text NOT NULL,

  -- Valuation
  calculated_trade_in_value numeric NOT NULL,
  deduction_breakdown jsonb NOT NULL DEFAULT '{}',
  condition_score text NOT NULL CHECK (condition_score IN ('mint', 'good', 'fair', 'poor')),

  -- Desired upgrade
  desired_inventory_id uuid REFERENCES swap_inventory(id),

  -- Deposit
  deposit_amount numeric NOT NULL DEFAULT 100,
  deposit_paid boolean DEFAULT false,
  deposit_payment_reference text,

  -- Status
  status text DEFAULT 'pending_deposit' CHECK (status IN (
    'pending_deposit',
    'pending_review',
    'approved',
    'rejected',
    'appointment_booked',
    'completed',
    'cancelled',
    'expired'
  )),

  -- Admin
  reviewed_by uuid REFERENCES profiles(id),
  rejection_reason text,
  approved_at timestamptz,
  offer_expires_at timestamptz,
  account_flagged boolean DEFAULT false,
  flag_reason text,

  -- Arrival mismatch
  arrival_recalculated boolean DEFAULT false,
  arrival_new_value numeric,
  arrival_decision text CHECK (arrival_decision IN ('accepted', 'cancelled')),

  created_at timestamptz DEFAULT now()
);

-- Available appointment slots (set by admin)
CREATE TABLE swap_available_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_datetime timestamptz NOT NULL,
  is_booked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Booked appointments
CREATE TABLE swap_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES swap_submissions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  slot_id uuid REFERENCES swap_available_slots(id),
  reminder_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE swap_phone_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_deduction_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_available_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_appointments ENABLE ROW LEVEL SECURITY;

-- swap_phone_models: public read, admin full access
CREATE POLICY "Public read swap_phone_models"
  ON swap_phone_models FOR SELECT USING (true);

CREATE POLICY "Admin full access swap_phone_models"
  ON swap_phone_models FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- swap_deduction_rates: public read, admin full access
CREATE POLICY "Public read swap_deduction_rates"
  ON swap_deduction_rates FOR SELECT USING (true);

CREATE POLICY "Admin full access swap_deduction_rates"
  ON swap_deduction_rates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- swap_inventory: public read active items, admin full access
CREATE POLICY "Public read active swap_inventory"
  ON swap_inventory FOR SELECT USING (is_active = true);

CREATE POLICY "Admin full access swap_inventory"
  ON swap_inventory FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- swap_submissions: users can view/create own, admins full access
CREATE POLICY "Users view own swap_submissions"
  ON swap_submissions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own swap_submissions"
  ON swap_submissions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin full access swap_submissions"
  ON swap_submissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- swap_available_slots: users can view, admins full access
CREATE POLICY "Users read swap_available_slots"
  ON swap_available_slots FOR SELECT USING (true);

CREATE POLICY "Admin full access swap_available_slots"
  ON swap_available_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- swap_appointments: users can view/create own, admins full access
CREATE POLICY "Users view own swap_appointments"
  ON swap_appointments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own swap_appointments"
  ON swap_appointments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin full access swap_appointments"
  ON swap_appointments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
