-- Partner role for phone dealer
-- The profiles.role column already accepts any text value.
-- This migration documents the 'partner' role and adds RLS policies
-- so partners can access swap tables directly via the browser client.

-- Partners can read all swap_submissions (to see appointments context)
CREATE POLICY "Partner read swap_submissions"
  ON swap_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'partner'
    )
  );

-- Partners can read all swap_appointments
CREATE POLICY "Partner read swap_appointments"
  ON swap_appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'partner'
    )
  );

-- Partners can read all swap_available_slots
-- (already covered by public read policy)

-- Partners can manage swap_inventory (full CRUD)
CREATE POLICY "Partner manage swap_inventory"
  ON swap_inventory FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'partner'
    )
  );

-- Partners can manage swap_phone_models
CREATE POLICY "Partner manage swap_phone_models"
  ON swap_phone_models FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'partner'
    )
  );

-- Partners can manage swap_deduction_rates
CREATE POLICY "Partner manage swap_deduction_rates"
  ON swap_deduction_rates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'partner'
    )
  );

-- To assign the partner role to a user, run:
-- UPDATE profiles SET role = 'partner' WHERE id = '<user-uuid>';
