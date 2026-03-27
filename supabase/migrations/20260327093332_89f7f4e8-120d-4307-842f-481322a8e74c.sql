-- FIX 1: Remove public INSERT on user_certifications (self-certification exploit)
DROP POLICY IF EXISTS "Users can insert their own certifications" ON public.user_certifications;

CREATE POLICY "Only service role can insert certifications"
  ON public.user_certifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Super admins can insert certifications"
  ON public.user_certifications
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

-- FIX 2: Restrict UPDATE on user_level_purchases (purchase status manipulation)
DROP POLICY IF EXISTS "own_or_admin_update_purchases" ON public.user_level_purchases;

CREATE POLICY "admin_update_purchases"
  ON public.user_level_purchases
  FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "own_update_purchases"
  ON public.user_level_purchases
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.protect_purchase_fields()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF is_super_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Cannot modify purchase status';
  END IF;
  IF NEW.price_paid IS DISTINCT FROM OLD.price_paid THEN
    RAISE EXCEPTION 'Cannot modify price_paid';
  END IF;
  IF NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id THEN
    RAISE EXCEPTION 'Cannot modify stripe_payment_intent_id';
  END IF;
  IF NEW.payment_method IS DISTINCT FROM OLD.payment_method THEN
    RAISE EXCEPTION 'Cannot modify payment_method';
  END IF;
  IF NEW.level IS DISTINCT FROM OLD.level THEN
    RAISE EXCEPTION 'Cannot modify level';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Cannot modify user_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_purchase_fields_trigger ON public.user_level_purchases;
CREATE TRIGGER protect_purchase_fields_trigger
  BEFORE UPDATE ON public.user_level_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_purchase_fields();

-- FIX 3: Restrict email_resend_log SELECT (data exposure)
DROP POLICY IF EXISTS "Authenticated can read resend log" ON public.email_resend_log;

CREATE POLICY "Admins can read resend log"
  ON public.email_resend_log
  FOR SELECT
  TO authenticated
  USING (is_any_admin());

-- FIX 4: Consolidate is_super_admin(uid) to use administrators table
CREATE OR REPLACE FUNCTION public.is_super_admin(uid uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.administrators a
    WHERE a.user_id = uid
      AND COALESCE(a.is_super_admin, false) = true
  );
$$;