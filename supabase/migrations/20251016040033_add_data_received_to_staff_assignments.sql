/*
  # Add Data Received Tracking to Staff Assignments

  1. Changes
    - Add `data_received` boolean field to `staff_assignments` table
    - Add `data_received_at` timestamp field to track when data was received
    - Add `data_received_by` text field to track who marked the data as received
  
  2. Purpose
    - Track which staff members have submitted their data for each event
    - Provide visibility into data collection progress per event
  
  3. Default Values
    - `data_received` defaults to false (not yet submitted)
    - `data_received_at` is null until data is received
    - `data_received_by` is null until data is received
*/

-- Add data_received tracking fields to staff_assignments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_assignments' AND column_name = 'data_received'
  ) THEN
    ALTER TABLE staff_assignments ADD COLUMN data_received boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_assignments' AND column_name = 'data_received_at'
  ) THEN
    ALTER TABLE staff_assignments ADD COLUMN data_received_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_assignments' AND column_name = 'data_received_by'
  ) THEN
    ALTER TABLE staff_assignments ADD COLUMN data_received_by text;
  END IF;
END $$;