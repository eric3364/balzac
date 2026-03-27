-- 1. CRITICAL: Remove user self-insert on purchases (only service_role + admin)
DROP POLICY IF EXISTS "own_or_admin_insert_purchases" ON public.user_level_purchases;
CREATE POLICY "admin_or_service_insert_purchases"
  ON public.user_level_purchases
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

-- 2. CRITICAL: Remove user self-update on purchases (keep admin only)
DROP POLICY IF EXISTS "own_update_purchases" ON public.user_level_purchases;

-- 3. Fix footer_settings ALL policy: restrict to authenticated
DROP POLICY IF EXISTS "Super admins can manage footer settings" ON public.footer_settings;
CREATE POLICY "Super admins can manage footer settings"
  ON public.footer_settings
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- 4. Fix resend_log ALL policy: restrict to authenticated
DROP POLICY IF EXISTS "Super admins can manage resend log" ON public.resend_log;
CREATE POLICY "Super admins can manage resend log"
  ON public.resend_log
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- 5. Planning objectives: restrict to admins + users with matching school/class
DROP POLICY IF EXISTS "Authenticated users can view planning objectives" ON public.planning_objectives;
CREATE POLICY "Admins can view all planning objectives"
  ON public.planning_objectives
  FOR SELECT
  TO authenticated
  USING (is_any_admin() AND is_active = true);

CREATE POLICY "Users can view their relevant planning objectives"
  ON public.planning_objectives
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid()
      AND (
        (planning_objectives.school IS NULL OR u.school = planning_objectives.school)
        AND (planning_objectives.class_name IS NULL OR u.class_name = planning_objectives.class_name)
        AND (planning_objectives.city IS NULL OR u.city = planning_objectives.city)
      )
    )
  );