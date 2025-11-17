-- Final fix for RLS infinite recursion using security definer function
-- Copy this ENTIRE file content into Supabase SQL Editor and run it

-- Drop problematic policies
DROP POLICY IF EXISTS "Agencies can manage client assignments" ON client_package_assignments;
DROP POLICY IF EXISTS "Clients can view assigned packages" ON agency_packages;

-- Create a security definer function to check client assignments without triggering RLS
CREATE OR REPLACE FUNCTION check_client_assignment(package_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function runs with elevated privileges, bypassing RLS
  RETURN EXISTS (
    SELECT 1 FROM client_package_assignments
    WHERE package_id = package_uuid
    AND client_user_id = user_uuid
  );
END;
$$;

-- Recreate "Agencies can manage client assignments" policy
-- Directly check agency_packages.agency_user_id (no cross-table RLS trigger)
CREATE POLICY "Agencies can manage client assignments"
  ON client_package_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM agency_packages ap
      WHERE ap.id = client_package_assignments.package_id
      AND ap.agency_user_id = auth.uid()
    )
  );

-- Recreate "Clients can view assigned packages" policy using the function
-- This avoids triggering RLS on client_package_assignments
CREATE POLICY "Clients can view assigned packages"
  ON agency_packages FOR SELECT
  USING (
    check_client_assignment(agency_packages.id, auth.uid())
  );

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_client_assignment(UUID, UUID) TO authenticated;

