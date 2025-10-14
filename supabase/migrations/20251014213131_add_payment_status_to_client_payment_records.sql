/*
  # Add Payment Status to Client Payment Records

  ## Overview
  This migration adds a payment_status field to track whether a payment has been received
  or is just an agreed amount pending receipt.

  ## Changes to Existing Tables
    - `client_payment_records` table
      - Add `payment_status` (text) - Either 'agreed' or 'received'
        - 'received' = Payment has been received from client
        - 'agreed' = Payment agreed but not yet received (pending)
      - Default value is 'received' for backward compatibility

  ## Security
    - No changes to RLS policies required
    - Existing policies will cover the new column

  ## Notes
    - Existing records will default to 'received' status
    - This enables tracking of payment commitments vs actual cash received
    - Helps distinguish between accounts receivable and actual revenue
*/

-- Add payment_status column to client_payment_records table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_payment_records' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE client_payment_records 
    ADD COLUMN payment_status text DEFAULT 'received' 
    CHECK (payment_status IN ('agreed', 'received'));
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_client_payment_records_status ON client_payment_records(payment_status);

-- Update existing records to have 'received' status (backward compatibility)
UPDATE client_payment_records 
SET payment_status = 'received' 
WHERE payment_status IS NULL;
