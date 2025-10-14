/*
  # Add Client Payments Support

  ## Overview
  This migration adds support for tracking client payments at the booking level.
  It adds package amount to bookings and creates a client payment records table.

  ## Changes to Existing Tables
    - `bookings` table
      - Add `package_amount` (numeric) - Total package/invoice amount for this booking
      - Add `booking_name` (text) - Name/reference for this booking (e.g., "Wedding Package")

  ## New Tables
    - `client_payment_records`
      - `id` (uuid, primary key) - Unique identifier
      - `client_id` (uuid, foreign key) - References clients table
      - `booking_id` (uuid, foreign key) - References bookings table
      - `amount` (numeric) - Payment amount with 2 decimal places
      - `payment_date` (date) - Date of payment
      - `payment_method` (text) - Cash, UPI, Bank Transfer, Cheque, Others
      - `transaction_ref` (text, optional) - Transaction reference number
      - `remarks` (text, optional) - Additional notes
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  ## Security
    - Enable RLS on `client_payment_records` table
    - Add policies for managing client payment records
    - All operations allowed for anonymous users (same as other tables)

  ## Notes
    - Package amount represents the total invoice amount for the booking
    - Booking name serves as a user-friendly identifier
    - Client payments are tracked at booking level, not event level
    - Payment amounts are stored as numeric for precise decimal handling
*/

-- Add columns to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'package_amount'
  ) THEN
    ALTER TABLE bookings ADD COLUMN package_amount numeric DEFAULT 0 CHECK (package_amount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'booking_name'
  ) THEN
    ALTER TABLE bookings ADD COLUMN booking_name text;
  END IF;
END $$;

-- Create client payment records table
CREATE TABLE IF NOT EXISTS client_payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'cheque', 'others')),
  transaction_ref text,
  remarks text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE client_payment_records ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view client payment records"
  ON client_payment_records FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert client payment records"
  ON client_payment_records FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update client payment records"
  ON client_payment_records FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete client payment records"
  ON client_payment_records FOR DELETE
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_payment_records_client_id ON client_payment_records(client_id);
CREATE INDEX IF NOT EXISTS idx_client_payment_records_booking_id ON client_payment_records(booking_id);
CREATE INDEX IF NOT EXISTS idx_client_payment_records_payment_date ON client_payment_records(payment_date);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);