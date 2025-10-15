/*
  # Allow NULL payment_method for Agreed Payments

  ## Overview
  This migration modifies the client_payment_records table to allow NULL values
  for the payment_method column. This is necessary because when a payment status
  is 'agreed' (setting package amount), payment method details are not yet known
  and should not be required.

  ## Changes to Existing Tables
    - `client_payment_records` table
      - Modify `payment_method` column to allow NULL values
      - Remove NOT NULL constraint from payment_method
      - Keep CHECK constraint for valid values when payment_method is provided

  ## Notes
    - Payment method is only required when payment_status = 'received'
    - When payment_status = 'agreed', payment_method can be NULL
    - This allows tracking of agreed package amounts before actual payment receipt
*/

-- Drop the existing check constraint on payment_method
ALTER TABLE client_payment_records 
DROP CONSTRAINT IF EXISTS client_payment_records_payment_method_check;

-- Alter column to allow NULL
ALTER TABLE client_payment_records 
ALTER COLUMN payment_method DROP NOT NULL;

-- Re-add check constraint to validate values when payment_method is provided
ALTER TABLE client_payment_records 
ADD CONSTRAINT client_payment_records_payment_method_check 
CHECK (payment_method IS NULL OR payment_method IN ('cash', 'upi', 'bank_transfer', 'cheque', 'others'));
