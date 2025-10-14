/*
  # Add Payment Transactions Support

  This migration enhances the payment system to support multiple payment transactions
  per staff member per event, enabling better tracking of partial payments and payment history.

  ## Changes Made

  1. New Table: `payment_transactions`
     - `id` (uuid, primary key) - Unique transaction identifier
     - `payment_id` (uuid, foreign key) - References payments table
     - `amount` (decimal) - Amount paid in this transaction
     - `payment_date` (date) - Date of this specific payment
     - `payment_mode` (text) - cash | bank_transfer | upi | cheque | others
     - `transaction_ref` (text, nullable) - Transaction reference ID
     - `payment_proof` (text, nullable) - Base64 encoded proof document
     - `notes` (text, nullable) - Transaction-specific notes
     - `created_at` (timestamptz) - Record creation timestamp
     - `updated_at` (timestamptz) - Last update timestamp

  2. Modified Table: `payments`
     - Make `event_id` nullable to support non-event payments
     - Add `is_non_event_payment` (boolean) - Flag for standalone payments
     - Remove `payment_date`, `payment_mode`, `transaction_ref`, `payment_proof` (moved to transactions)
     - Keep `amount_paid` as calculated field (will be updated via trigger)
     - Add constraint: notes required when event_id is null

  3. Security
     - Enable RLS on payment_transactions table
     - Add policies for authenticated users to manage transactions
     - Maintain existing RLS policies on payments table

  4. Indexes
     - Index on payment_id for transaction lookups
     - Index on payment_date for chronological queries

  5. Triggers
     - Auto-update amount_paid in payments when transactions are added/updated/deleted
     - Auto-update status based on amount_paid vs agreed_amount
*/

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  amount decimal(10, 2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_mode text NOT NULL CHECK (payment_mode IN ('cash', 'bank_transfer', 'upi', 'cheque', 'others')),
  transaction_ref text,
  payment_proof text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON payment_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_date ON payment_transactions(payment_date);

-- Modify payments table to support non-event payments
DO $$
BEGIN
  -- Make event_id nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'event_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE payments ALTER COLUMN event_id DROP NOT NULL;
  END IF;

  -- Add is_non_event_payment column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'is_non_event_payment'
  ) THEN
    ALTER TABLE payments ADD COLUMN is_non_event_payment boolean DEFAULT false;
  END IF;
END $$;

-- Add constraint: notes required for non-event payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_non_event_payment_notes'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT chk_non_event_payment_notes 
    CHECK (
      (event_id IS NOT NULL) OR 
      (event_id IS NULL AND is_non_event_payment = true AND notes IS NOT NULL AND notes != '')
    );
  END IF;
END $$;

-- Create function to update amount_paid based on transactions
CREATE OR REPLACE FUNCTION update_payment_amount_paid()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE payments
  SET 
    amount_paid = COALESCE((
      SELECT SUM(amount)
      FROM payment_transactions
      WHERE payment_id = COALESCE(NEW.payment_id, OLD.payment_id)
    ), 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.payment_id, OLD.payment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create function to update payment status based on amounts
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status based on amount_paid vs agreed_amount
  IF NEW.amount_paid = 0 THEN
    NEW.status = 'pending';
  ELSIF NEW.amount_paid >= NEW.agreed_amount THEN
    NEW.status = 'paid';
  ELSE
    NEW.status = 'partial';
  END IF;
  
  -- Check for overdue status
  IF NEW.status != 'paid' AND NEW.event_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM events
      WHERE id = NEW.event_id
      AND event_date < CURRENT_DATE - INTERVAL '30 days'
    ) THEN
      NEW.status = 'overdue';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trg_update_payment_amount_paid_insert ON payment_transactions;
CREATE TRIGGER trg_update_payment_amount_paid_insert
AFTER INSERT ON payment_transactions
FOR EACH ROW
EXECUTE FUNCTION update_payment_amount_paid();

DROP TRIGGER IF EXISTS trg_update_payment_amount_paid_update ON payment_transactions;
CREATE TRIGGER trg_update_payment_amount_paid_update
AFTER UPDATE ON payment_transactions
FOR EACH ROW
EXECUTE FUNCTION update_payment_amount_paid();

DROP TRIGGER IF EXISTS trg_update_payment_amount_paid_delete ON payment_transactions;
CREATE TRIGGER trg_update_payment_amount_paid_delete
AFTER DELETE ON payment_transactions
FOR EACH ROW
EXECUTE FUNCTION update_payment_amount_paid();

DROP TRIGGER IF EXISTS trg_update_payment_status ON payments;
CREATE TRIGGER trg_update_payment_status
BEFORE INSERT OR UPDATE OF amount_paid, agreed_amount ON payments
FOR EACH ROW
EXECUTE FUNCTION update_payment_status();

-- Enable RLS on payment_transactions
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_transactions
CREATE POLICY "Allow all operations for authenticated users on payment_transactions"
  ON payment_transactions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
