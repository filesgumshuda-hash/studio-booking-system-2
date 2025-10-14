/*
  # Update RLS Policies for Anonymous Access

  ## Changes
  This migration updates Row Level Security (RLS) policies to allow anonymous access
  for internal management system usage. This is appropriate for internal tools where
  authentication is not required.

  ## Security Notes
  - Allows anonymous (`anon`) role to access all tables
  - Suitable for internal management systems
  - The Supabase anon key should still be kept secure
  - For production external-facing apps, implement proper authentication

  ## Tables Updated
  - clients
  - bookings
  - events
  - staff
  - staff_assignments
  - workflows
  - payments
*/

-- Drop existing restrictive policies for authenticated users
DROP POLICY IF EXISTS "Allow all operations for authenticated users on clients" ON clients;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on bookings" ON bookings;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on events" ON events;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on staff" ON staff;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on staff_assignments" ON staff_assignments;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on workflows" ON workflows;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on payments" ON payments;

-- Create new policies allowing anonymous access

-- Clients table
CREATE POLICY "Allow anonymous access to clients"
  ON clients FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Bookings table
CREATE POLICY "Allow anonymous access to bookings"
  ON bookings FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Events table
CREATE POLICY "Allow anonymous access to events"
  ON events FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Staff table
CREATE POLICY "Allow anonymous access to staff"
  ON staff FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Staff assignments table
CREATE POLICY "Allow anonymous access to staff_assignments"
  ON staff_assignments FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Workflows table
CREATE POLICY "Allow anonymous access to workflows"
  ON workflows FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Payments table
CREATE POLICY "Allow anonymous access to payments"
  ON payments FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);