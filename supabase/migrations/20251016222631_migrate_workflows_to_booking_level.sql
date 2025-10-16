/*
  # Migrate Workflows from Event-Level to Booking-Level

  ## Problem
  Currently, workflows are tied to individual events (event_id), meaning:
  - A booking with 4 events has 4 separate workflow instances
  - Still workflow appears 4 times (one per event)
  - Reel, Video, Portrait workflows also duplicated per event
  - This is incorrect because deliverables are per-booking, not per-event

  ## Solution
  Migrate workflows to be tied to bookings (booking_id):
  - ONE workflow instance per booking
  - Still, Reel, Video, Portrait track delivery to client (booking-level)
  - Adding/removing events doesn't affect workflow
  - Matches real-world process: client receives one album for entire booking

  ## Changes
  1. Add booking_id column to workflows table
  2. Populate booking_id from existing event_id relationships
  3. Remove event_id foreign key constraint
  4. Add booking_id foreign key constraint
  5. Update unique constraint to use booking_id instead of event_id
  6. Consolidate duplicate workflows (keep one per booking)
  7. Update indexes
  8. Make event_id nullable for booking-level workflows
*/

-- Step 1: Add booking_id column (nullable initially)
ALTER TABLE workflows
ADD COLUMN IF NOT EXISTS booking_id uuid;

-- Step 2: Populate booking_id from event_id
-- Get booking_id for each workflow by joining through events table
UPDATE workflows w
SET booking_id = e.booking_id
FROM events e
WHERE w.event_id = e.id AND w.booking_id IS NULL;

-- Step 3: Consolidate duplicate workflows per booking
-- For each booking, keep only the workflow with most completed steps
-- Delete other workflows for the same booking

-- Create a temporary function to count completed steps
CREATE OR REPLACE FUNCTION total_workflow_progress(
  still jsonb,
  reel jsonb,
  video jsonb,
  portrait jsonb
) RETURNS integer AS $$
DECLARE
  total integer := 0;
  key text;
BEGIN
  -- Count completed in still_workflow
  FOR key IN SELECT jsonb_object_keys(still) LOOP
    IF (still->key->>'completed')::boolean = true THEN
      total := total + 1;
    END IF;
  END LOOP;

  -- Count completed in reel_workflow
  FOR key IN SELECT jsonb_object_keys(reel) LOOP
    IF (reel->key->>'completed')::boolean = true THEN
      total := total + 1;
    END IF;
  END LOOP;

  -- Count completed in video_workflow
  FOR key IN SELECT jsonb_object_keys(video) LOOP
    IF (video->key->>'completed')::boolean = true THEN
      total := total + 1;
    END IF;
  END LOOP;

  -- Count completed in portrait_workflow
  FOR key IN SELECT jsonb_object_keys(portrait) LOOP
    IF (portrait->key->>'completed')::boolean = true THEN
      total := total + 1;
    END IF;
  END LOOP;

  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Delete duplicate workflows, keeping the one with most progress
DELETE FROM workflows w1
WHERE EXISTS (
  SELECT 1
  FROM workflows w2
  WHERE w2.booking_id = w1.booking_id
  AND w2.id <> w1.id
  AND total_workflow_progress(
    w2.still_workflow,
    w2.reel_workflow,
    w2.video_workflow,
    w2.portrait_workflow
  ) > total_workflow_progress(
    w1.still_workflow,
    w1.reel_workflow,
    w1.video_workflow,
    w1.portrait_workflow
  )
);

-- Handle ties: if multiple workflows have same progress, keep the oldest one
DELETE FROM workflows w1
WHERE EXISTS (
  SELECT 1
  FROM workflows w2
  WHERE w2.booking_id = w1.booking_id
  AND w2.id <> w1.id
  AND total_workflow_progress(
    w2.still_workflow,
    w2.reel_workflow,
    w2.video_workflow,
    w2.portrait_workflow
  ) = total_workflow_progress(
    w1.still_workflow,
    w1.reel_workflow,
    w1.video_workflow,
    w1.portrait_workflow
  )
  AND w2.created_at < w1.created_at
);

-- Clean up helper function
DROP FUNCTION IF EXISTS total_workflow_progress(jsonb, jsonb, jsonb, jsonb);

-- Step 4: Make booking_id NOT NULL now that all records have it
ALTER TABLE workflows
ALTER COLUMN booking_id SET NOT NULL;

-- Step 5: Drop old event_id constraint
ALTER TABLE workflows
DROP CONSTRAINT IF EXISTS workflows_event_id_fkey;

-- Drop unique constraint on event_id
ALTER TABLE workflows
DROP CONSTRAINT IF EXISTS workflows_event_id_key;

-- Step 6: Make event_id nullable (for booking-level workflows)
ALTER TABLE workflows
ALTER COLUMN event_id DROP NOT NULL;

-- Step 7: Add new booking_id foreign key constraint
ALTER TABLE workflows
ADD CONSTRAINT workflows_booking_id_fkey
FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

-- Step 8: Add unique constraint on booking_id (one workflow per booking)
-- Note: We use a unique index that allows NULL event_id
CREATE UNIQUE INDEX IF NOT EXISTS workflows_booking_id_unique_idx 
ON workflows(booking_id) 
WHERE event_id IS NULL;

-- Step 9: Drop old index on event_id
DROP INDEX IF EXISTS idx_workflows_event_id;

-- Step 10: Create new index on booking_id
CREATE INDEX IF NOT EXISTS idx_workflows_booking_id ON workflows(booking_id);

-- Add comments to explain the change
COMMENT ON COLUMN workflows.booking_id IS 'Primary relationship: workflows are tied to bookings, not events. One workflow per booking tracks deliverables (album, reel, video, portrait) that are delivered once per booking.';
COMMENT ON COLUMN workflows.event_id IS 'Now nullable. NULL indicates booking-level workflow. Legacy event-level workflows may still have event_id set.';