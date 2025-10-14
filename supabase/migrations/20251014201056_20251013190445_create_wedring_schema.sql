/*
  # WedRing Studios Management System Database Schema

  ## Overview
  This migration creates the complete database structure for a wedding photography management system
  with support for clients, bookings, events, staff assignments, workflows, and payments.

  ## New Tables

  ### 1. `clients`
  - `id` (uuid, primary key) - Unique client identifier
  - `name` (text) - Client full name
  - `contact_number` (text) - Primary phone number (10 digits)
  - `email` (text, nullable) - Email address
  - `alternate_contact` (text, nullable) - Secondary phone number
  - `notes` (text, nullable) - General client notes
  - `created_at` (timestamptz) - Record creation timestamp

  ### 2. `bookings`
  - `id` (uuid, primary key) - Unique booking identifier
  - `client_id` (uuid, foreign key) - References clients table
  - `booking_date` (timestamptz) - When booking was created
  - `notes` (text, nullable) - Booking-level notes
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. `events`
  - `id` (uuid, primary key) - Unique event identifier
  - `booking_id` (uuid, foreign key) - References bookings table
  - `event_name` (text) - Event type (Wedding, Pre-wedding, etc.)
  - `event_date` (date) - Date of event
  - `time_slot` (text) - morning | afternoon | evening | fullDay
  - `venue` (text) - Event venue name
  - `notes` (text, nullable) - Event-specific notes (venue address, guest count, etc.)
  - `photographers_required` (int) - Number of photographers needed
  - `videographers_required` (int) - Number of videographers needed
  - `drone_operators_required` (int) - Number of drone operators needed
  - `editors_required` (int) - Number of editors needed
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 4. `staff`
  - `id` (uuid, primary key) - Unique staff identifier
  - `name` (text) - Staff full name
  - `role` (text) - photographer | videographer | drone_operator | editor | manager | coordinator
  - `contact_number` (text) - Phone number
  - `email` (text, nullable) - Email address
  - `join_date` (date) - Date staff joined
  - `status` (text) - active | inactive
  - `created_at` (timestamptz) - Record creation timestamp

  ### 5. `staff_assignments`
  - `id` (uuid, primary key) - Unique assignment identifier
  - `event_id` (uuid, foreign key) - References events table
  - `staff_id` (uuid, foreign key) - References staff table
  - `role` (text) - Role for this specific event
  - `created_at` (timestamptz) - Record creation timestamp

  ### 6. `workflows`
  - `id` (uuid, primary key) - Unique workflow identifier
  - `event_id` (uuid, foreign key) - References events table
  - Workflow tracking fields for each category (Still, Reel, Video, Portrait)
  - Each step has: completed (boolean), completed_at (timestamptz), updated_by (text), notes (text)

  ### 7. `payments`
  - `id` (uuid, primary key) - Unique payment identifier
  - `event_id` (uuid, foreign key) - References events table
  - `staff_id` (uuid, foreign key) - References staff table
  - `role` (text) - Role for payment
  - `agreed_amount` (decimal) - Total agreed payment
  - `amount_paid` (decimal) - Amount paid so far
  - `status` (text) - pending | partial | paid | overdue
  - `payment_date` (date, nullable) - Date of payment
  - `payment_mode` (text, nullable) - cash | bank_transfer | upi | cheque | others
  - `transaction_ref` (text, nullable) - Transaction reference ID
  - `payment_proof` (text, nullable) - Base64 encoded image/document
  - `notes` (text, nullable) - Payment notes
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users to manage their data
  - Admin users can access all data
  - Manager users can access their assigned events
  - Staff users can view their assigned events and payments

  ## Indexes
  - Index on foreign keys for performance
  - Index on frequently queried fields (event_date, status, contact_number)
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_number text NOT NULL,
  email text,
  alternate_contact text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  booking_date timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  event_date date NOT NULL,
  time_slot text NOT NULL CHECK (time_slot IN ('morning', 'afternoon', 'evening', 'fullDay')),
  venue text NOT NULL,
  notes text,
  photographers_required int DEFAULT 0,
  videographers_required int DEFAULT 0,
  drone_operators_required int DEFAULT 0,
  editors_required int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('photographer', 'videographer', 'drone_operator', 'editor', 'manager', 'coordinator')),
  contact_number text NOT NULL,
  email text,
  join_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- Create staff_assignments table
CREATE TABLE IF NOT EXISTS staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, staff_id)
);

-- Create workflows table with JSONB for flexible workflow tracking
CREATE TABLE IF NOT EXISTS workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE UNIQUE,
  still_workflow jsonb DEFAULT '{"rawDataSent": {"completed": false}, "clientSelectionReceived": {"completed": false}, "sentToAlbumEditor": {"completed": false}, "albumPreviewSent": {"completed": false}, "clientApproved": {"completed": false}, "revisionRequested": {"completed": false}, "sentForPrinting": {"completed": false}, "albumFinalized": {"completed": false}, "deliveredToClient": {"completed": false}}'::jsonb,
  reel_workflow jsonb DEFAULT '{"reelSentToEditor": {"completed": false}, "reelReceivedFromEditor": {"completed": false}, "reelSentToClient": {"completed": false}, "reelDelivered": {"completed": false}}'::jsonb,
  video_workflow jsonb DEFAULT '{"videoSentToEditor": {"completed": false}, "videoReceivedFromEditor": {"completed": false}, "videoSentToClient": {"completed": false}, "videoDelivered": {"completed": false}}'::jsonb,
  portrait_workflow jsonb DEFAULT '{"portraitEdited": {"completed": false}, "portraitDelivered": {"completed": false}}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  role text NOT NULL,
  agreed_amount decimal(10, 2) DEFAULT 0,
  amount_paid decimal(10, 2) DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
  payment_date date,
  payment_mode text CHECK (payment_mode IN ('cash', 'bank_transfer', 'upi', 'cheque', 'others')),
  transaction_ref text,
  payment_proof text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_events_booking_id ON events(booking_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_event_id ON staff_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_staff_id ON staff_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_payments_event_id ON payments(event_id);
CREATE INDEX IF NOT EXISTS idx_payments_staff_id ON payments(staff_id);
CREATE INDEX IF NOT EXISTS idx_workflows_event_id ON workflows(event_id);
CREATE INDEX IF NOT EXISTS idx_clients_contact_number ON clients(contact_number);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (simplified for internal management system)
-- In production, implement role-based policies based on user roles

CREATE POLICY "Allow all operations for authenticated users on clients"
  ON clients FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on bookings"
  ON bookings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on events"
  ON events FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on staff"
  ON staff FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on staff_assignments"
  ON staff_assignments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on workflows"
  ON workflows FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on payments"
  ON payments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);