/*
  # Add Anonymous Access to Expenses Table

  ## Changes
  This migration adds anonymous access policy to the expenses table to match
  the access pattern used by other tables in the system (clients, bookings, 
  events, staff, etc.).

  ## Security Notes
  - Allows anonymous (`anon`) role to access expenses table
  - Consistent with other internal management system tables
  - Suitable for internal tools where authentication is not required

  ## Tables Updated
  - expenses: Add anonymous access policy
*/

-- Add anonymous access policy for expenses table
CREATE POLICY "Allow anonymous access to expenses"
  ON expenses FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
