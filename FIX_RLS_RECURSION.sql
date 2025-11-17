-- Fix RLS infinite recursion in agency_packages and client_package_assignments
-- Copy this ENTIRE file content into Supabase SQL Editor and run it

-- Drop the problematic policies
DROP POLICY IF EXISTS "Agencies can manage client assignments" ON client_package_assignments;
DROP POLICY IF EXISTS "Clients can view assigned packages" ON agency_packages;

-- Recreate "Agencies can manage client assignments" policy without circular dependency
-- Agencies can manage assignments for packages they own
CREATE POLICY "Agencies can manage client assignments"
  ON client_package_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM agency_packages ap
      WHERE ap.id = client_package_assignments.package_id
      AND ap.agency_user_id = auth.uid()
    )
  );

-- Recreate "Clients can view assigned packages" policy without circular dependency
-- Clients can view packages they are assigned to
CREATE POLICY "Clients can view assigned packages"
  ON agency_packages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_package_assignments cpa
      WHERE cpa.package_id = agency_packages.id
      AND cpa.client_user_id = auth.uid()
    )
  );

