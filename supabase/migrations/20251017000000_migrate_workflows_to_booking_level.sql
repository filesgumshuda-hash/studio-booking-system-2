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

  ## Data Migration Strategy
  - For bookings with multiple events (multiple workflow records):
    - Keep the workflow with the most progress
    - Delete duplicate workflows for other events in same booking
  - For bookings with one event:
    - Simply update event_id to booking_id

  ## Important Notes
  - This is a breaking change that requires code updates
  - Workflow queries must change from event_id to booking_id
  - UI must show single workflow section at booking level
  - Data collection (data_received) remains at event level (per photographer/videographer)
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

-- Create a temporary function to count completed steps in a workflow
CREATE OR REPLACE FUNCTION count_completed_steps(workflow_data jsonb)
RETURNS integer AS $$
DECLARE
  completed_count integer := 0;
  workflow_key text;
  step_key text;
  step_value jsonb;
BEGIN
  -- Iterate through all workflow types
  FOR workflow_key IN SELECT jsonb_object_keys(workflow_data)
  LOOP
    -- Get the workflow object
    FOR step_key IN SELECT jsonb_object_keys(workflow_data->workflow_key)
    LOOP
      step_value := workflow_data->workflow_key->step_key;
      IF (step_value->>'completed')::boolean = true THEN
        completed_count := completed_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN completed_count;
END;
$$ LANGUAGE plpgsql;

-- Alternative simpler approach: count completed in each workflow type
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

-- Clean up helper functions
DROP FUNCTION IF EXISTS count_completed_steps(jsonb);
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

-- Step 6: Add new booking_id foreign key constraint
ALTER TABLE workflows
ADD CONSTRAINT workflows_booking_id_fkey
FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

-- Step 7: Add unique constraint on booking_id (one workflow per booking)
ALTER TABLE workflows
ADD CONSTRAINT workflows_booking_id_key UNIQUE (booking_id);

-- Step 8: Drop old index on event_id
DROP INDEX IF EXISTS idx_workflows_event_id;

-- Step 9: Create new index on booking_id
CREATE INDEX IF NOT EXISTS idx_workflows_booking_id ON workflows(booking_id);

-- Step 10: We keep event_id column for now but it's no longer used
-- This allows for a gradual migration without breaking existing code immediately
-- In a future migration, we can drop the event_id column entirely
-- For now, we just remove its constraints and indexes

-- Add comment to explain the change
COMMENT ON COLUMN workflows.booking_id IS 'Primary relationship: workflows are tied to bookings, not events. One workflow per booking tracks deliverables (album, reel, video, portrait) that are delivered once per booking.';
COMMENT ON COLUMN workflows.event_id IS 'DEPRECATED: No longer used. Workflows are now booking-level. This column will be removed in a future migration.';

/*
  ## Verification Queries

  -- Check that each booking has exactly one workflow
  SELECT booking_id, COUNT(*) as workflow_count
  FROM workflows
  GROUP BY booking_id
  HAVING COUNT(*) <> 1;
  -- Should return 0 rows

  -- Check that all workflows have booking_id
  SELECT COUNT(*) FROM workflows WHERE booking_id IS NULL;
  -- Should return 0

  -- View workflow distribution
  SELECT
    b.id as booking_id,
    b.booking_name,
    c.name as client_name,
    COUNT(e.id) as event_count,
    COUNT(DISTINCT w.id) as workflow_count
  FROM bookings b
  LEFT JOIN clients c ON b.client_id = c.id
  LEFT JOIN events e ON e.booking_id = b.id
  LEFT JOIN workflows w ON w.booking_id = b.id
  GROUP BY b.id, b.booking_name, c.name
  ORDER BY event_count DESC;
*/
