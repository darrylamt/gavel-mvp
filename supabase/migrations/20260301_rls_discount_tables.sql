-- Enable RLS on discount_codes table
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active discount codes (needed for checkout validation)
CREATE POLICY "Allow public read active discount codes" ON public.discount_codes
  FOR SELECT
  USING (is_active = true);

-- Allow admins to manage all discount codes
CREATE POLICY "Allow admins all access to discount codes" ON public.discount_codes
  FOR ALL
  USING (
    (SELECT profiles.role FROM public.profiles
     WHERE profiles.id = auth.uid()) = 'admin'
  );

-- Enable RLS on discount_code_usages table
ALTER TABLE public.discount_code_usages ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own discount code usages
CREATE POLICY "Allow users read own discount usages" ON public.discount_code_usages
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow authenticated users to insert their own usages
CREATE POLICY "Allow users create discount usages" ON public.discount_code_usages
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

