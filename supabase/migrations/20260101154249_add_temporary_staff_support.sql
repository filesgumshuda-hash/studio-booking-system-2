/*
  # Add Temporary Staff Support

  1. Changes
    - Add 'temporary' as a valid status value for staff
    - Make contact_number optional (nullable) for temporary staff
  
  2. Details
    - Updates staff table status CHECK constraint to include 'temporary'
    - Removes NOT NULL constraint from contact_number field
    - Temporary staff can be added without contact information
*/

-- Drop existing status constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'staff_status_check'
  ) THEN
    ALTER TABLE staff DROP CONSTRAINT staff_status_check;
  END IF;
END $$;

-- Add new status constraint with 'temporary' option
ALTER TABLE staff 
ADD CONSTRAINT staff_status_check 
CHECK (status IN ('active', 'inactive', 'temporary'));

-- Make contact_number optional
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' 
    AND column_name = 'contact_number' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE staff ALTER COLUMN contact_number DROP NOT NULL;
  END IF;
END $$;
