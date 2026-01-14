/*
  # Create Staff Payments Table

  1. New Tables
    - `staff_payments`
      - `id` (uuid, primary key)
      - `booking_id` (uuid) - reference to bookings table
      - `event_id` (uuid, nullable) - reference to events table (optional)
      - `staff_id` (uuid) - reference to staff table
      - `amount` (numeric) - payment amount
      - `status` (text) - 'agreed' or 'paid'
      - `date` (date) - payment date
      - `payment_method` (text, nullable) - cash, upi, bank_transfer, card (only for paid status)
      - `remarks` (text, nullable) - additional notes
      - `created_at` (timestamptz) - creation timestamp
      - `updated_at` (timestamptz) - update timestamp

  2. Security
    - Enable RLS on `staff_payments` table
    - Add policy for anonymous access to match other tables in the system
*/

CREATE TABLE IF NOT EXISTS staff_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL CHECK (status IN ('agreed', 'paid')),
  date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'card')),
  remarks text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE staff_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous access to staff_payments"
  ON staff_payments FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view all staff_payments"
  ON staff_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert staff_payments"
  ON staff_payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update staff_payments"
  ON staff_payments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete staff_payments"
  ON staff_payments FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_staff_payments_booking_id ON staff_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_staff_payments_event_id ON staff_payments(event_id);
CREATE INDEX IF NOT EXISTS idx_staff_payments_staff_id ON staff_payments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_payments_date ON staff_payments(date);
CREATE INDEX IF NOT EXISTS idx_staff_payments_status ON staff_payments(status);
