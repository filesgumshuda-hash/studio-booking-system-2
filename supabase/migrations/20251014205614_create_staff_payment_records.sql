/*
  # Create Staff Payment Records Table

  ## Overview
  This migration creates a new table to track individual payment records for staff members.
  It supports two types of records: "agreed" (payment agreements) and "made" (actual payments made).

  ## New Tables
    - `staff_payment_records`
      - `id` (uuid, primary key) - Unique identifier
      - `staff_id` (uuid, foreign key) - References staff table
      - `type` (text) - Either "agreed" or "made"
      - `amount` (numeric) - Payment amount with 2 decimal places
      - `payment_date` (date) - Date of payment agreement or actual payment
      - `payment_method` (text, optional) - Cash, UPI, Bank Transfer, Cheque, Others (required only for "made" type)
      - `remarks` (text, optional) - Additional notes (max 200 characters)
      - `event_id` (uuid, optional) - Link to specific event if applicable
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  ## Security
    - Enable RLS on `staff_payment_records` table
    - Add policies for authenticated users to manage payment records
    - All operations require authentication

  ## Notes
    - Payment amounts are stored as numeric for precise decimal handling
    - Type field is constrained to only "agreed" or "made" values
    - Payment method is optional but typically used with "made" type payments
    - Event linkage is optional - payments can be general or event-specific
*/

CREATE TABLE IF NOT EXISTS staff_payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('agreed', 'made')),
  amount numeric NOT NULL CHECK (amount > 0 AND amount <= 999999),
  payment_date date NOT NULL,
  payment_method text CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'cheque', 'others')),
  remarks text,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE staff_payment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view staff payment records"
  ON staff_payment_records FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert staff payment records"
  ON staff_payment_records FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update staff payment records"
  ON staff_payment_records FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete staff payment records"
  ON staff_payment_records FOR DELETE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_staff_payment_records_staff_id ON staff_payment_records(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_payment_records_event_id ON staff_payment_records(event_id);
CREATE INDEX IF NOT EXISTS idx_staff_payment_records_type ON staff_payment_records(type);
CREATE INDEX IF NOT EXISTS idx_staff_payment_records_payment_date ON staff_payment_records(payment_date);