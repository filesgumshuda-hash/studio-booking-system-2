/*
  # Create Expenses Table

  1. New Tables
    - `expenses`
      - `id` (uuid, primary key)
      - `type` (text) - 'general' or 'booking'
      - `amount` (numeric) - expense amount
      - `description` (text) - expense description
      - `date` (date) - expense date
      - `payment_method` (text) - cash, upi, bank_transfer, card
      - `booking_id` (uuid, nullable) - reference to bookings table (null for general expenses)
      - `created_at` (timestamptz) - creation timestamp
      - `updated_at` (timestamptz) - update timestamp

  2. Security
    - Enable RLS on `expenses` table
    - Add policy for authenticated users to manage their expenses
*/

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('general', 'booking')),
  amount numeric NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'card')),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_expenses_booking_id ON expenses(booking_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(type);