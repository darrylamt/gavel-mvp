-- Assign partner role to phone dealer account

-- Step 1: expand the role check constraint to include 'partner'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'seller', 'admin', 'partner'));

-- Step 2: bypass the role-change trigger and update the user
DO $$
DECLARE
  v_trigger text;
BEGIN
  SELECT tgname INTO v_trigger
  FROM pg_trigger
  WHERE tgrelid = 'public.profiles'::regclass
    AND tgfoid = (
      SELECT oid FROM pg_proc
      WHERE proname = 'prevent_non_admin_role_change'
      LIMIT 1
    )
  LIMIT 1;

  IF v_trigger IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DISABLE TRIGGER %I', v_trigger);
  END IF;
END $$;

UPDATE profiles
SET role = 'partner'
WHERE id = '12be6c62-cc2c-4e27-b70e-18b14d3e67b2';

-- Re-enable the trigger
DO $$
DECLARE
  v_trigger text;
BEGIN
  SELECT tgname INTO v_trigger
  FROM pg_trigger
  WHERE tgrelid = 'public.profiles'::regclass
    AND tgfoid = (
      SELECT oid FROM pg_proc
      WHERE proname = 'prevent_non_admin_role_change'
      LIMIT 1
    )
  LIMIT 1;

  IF v_trigger IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles ENABLE TRIGGER %I', v_trigger);
  END IF;
END $$;
