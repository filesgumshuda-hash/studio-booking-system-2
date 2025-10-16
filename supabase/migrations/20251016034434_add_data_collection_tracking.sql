-- Add Data Collection Tracking for Event Staff
--
-- Overview:
-- This migration adds data collection tracking capabilities to monitor the progress
-- of photographers and videographers in collecting still photos and videos for each event.
--
-- New Tables:
-- - event_data_collection: Tracks still photos and videos collected per staff per event
--
-- Security:
-- - Enable RLS on event_data_collection table
-- - Add policies for authenticated users to read, insert, and update records

CREATE TABLE IF NOT EXISTS event_data_collection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  still_photos_target integer DEFAULT 0 NOT NULL,
  still_photos_collected integer DEFAULT 0 NOT NULL,
  videos_target integer DEFAULT 0 NOT NULL,
  videos_collected integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(event_id, staff_id)
);

ALTER TABLE event_data_collection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read data collection"
  ON event_data_collection FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert data collection"
  ON event_data_collection FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update data collection"
  ON event_data_collection FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete data collection"
  ON event_data_collection FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_event_data_collection_event_id ON event_data_collection(event_id);
CREATE INDEX IF NOT EXISTS idx_event_data_collection_staff_id ON event_data_collection(staff_id);
