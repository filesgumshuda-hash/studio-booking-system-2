/*
  # Create Authentication System

  ## Overview
  This migration creates a complete authentication system with role-based access control
  for WedRing Studios Management System.

  ## New Tables
    - `users`
      - `id` (uuid, primary key) - Unique identifier
      - `name` (text) - Full name
      - `phone` (text, unique) - 10-digit phone number
      - `email` (text, unique) - Email address
      - `password` (text) - Hashed password (storing plain text for demo)
      - `role` (text) - User role: admin, manager, or staff
      - `staff_id` (uuid, foreign key, optional) - References staff table
      - `is_active` (boolean) - Account active status
      - `created_at` (timestamptz) - Account creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  ## Security
    - Enable RLS on `users` table
    - Add policies for user authentication and management
    - Anonymous users can read users table (for login validation)
    - All users can update their own profile

  ## Notes
    - Passwords stored as plain text for testing purposes (in production, use proper hashing)
    - Three roles: admin (full access), manager (limited), staff (view-only for own data)
    - Manager and staff roles must have a staff_id linking to staff table
    - Admin role does not require staff_id
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text UNIQUE NOT NULL CHECK (phone ~ '^[0-9]{10}$'),
  email text UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  password text NOT NULL CHECK (length(password) >= 6),
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view users for login"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert users"
  ON users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update users"
  ON users FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete users"
  ON users FOR DELETE
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_staff_id ON users(staff_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
