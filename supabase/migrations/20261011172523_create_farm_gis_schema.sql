/*
# Farm GIS Mapping System — Core Schema

## Overview
Creates the database schema for a multi-user Farm GIS Mapping application with PostGIS spatial features.
Each user manages their own farms, irrigation points, and activity records.

## New Tables

1. **farms** — Stores farm records with boundary geometry
   - id (uuid, PK)
   - user_id (uuid, FK to auth.users, defaults to auth.uid())
   - name (text, not null)
   - owner (text, farmer/owner name)
   - location (text, human-readable location description)
   - center_lat (double precision, latitude of farm center)
   - center_lng (double precision, longitude of farm center)
   - boundary (geometry, Polygon EPSG:4326 — the farm boundary polygon)
   - area_hectares (double precision, calculated polygon area)
   - area_acres (double precision, calculated polygon area in acres)
   - crop_type (text, current crop)
   - planting_date (date, when crop was planted)
   - soil_type (text, soil classification)
   - irrigation_method (text, irrigation approach)
   - notes (text, free-form notes)
   - photo_url (text, optional photograph URL)
   - is_demo (boolean, flags seed/demo data)
   - created_at (timestamptz)
   - updated_at (timestamptz)

2. **irrigation_points** — Stores irrigation infrastructure locations
   - id (uuid, PK)
   - farm_id (uuid, FK to farms ON DELETE CASCADE)
   - user_id (uuid, FK to auth.users, defaults to auth.uid())
   - type (text, irrigation point type: drip, sprinkler, pivot, canal, etc.)
   - lat (double precision)
   - lng (double precision)
   - notes (text)
   - created_at (timestamptz)

3. **farm_activity** — Activity/change log for farms
   - id (uuid, PK)
   - farm_id (uuid, FK to farms ON DELETE CASCADE)
   - user_id (uuid, FK to auth.users)
   - action (text, what happened: created, updated, deleted, etc.)
   - details (text, JSON-like description of changes)
   - created_at (timestamptz)

## Security
- RLS enabled on all tables.
- Owner-scoped CRUD: users can only access their own rows (auth.uid() = user_id).
- Child tables (irrigation_points, farm_activity) scoped through user_id directly.

## Indexes
- GIST index on farms.boundary for spatial queries
- B-tree indexes on foreign keys and commonly queried columns

## Notes
- PostGIS extension is enabled for geometry types and spatial functions
- boundary column stores GeoJSON-compatible Polygon geometries in EPSG:4326
- area_hectares and area_acres are calculated client-side and stored for convenience
*/

CREATE EXTENSION IF NOT EXISTS postgis;

-- Farms table
CREATE TABLE IF NOT EXISTS farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  owner text DEFAULT '',
  location text DEFAULT '',
  center_lat double precision DEFAULT 0,
  center_lng double precision DEFAULT 0,
  boundary geometry(Polygon, 4326),
  area_hectares double precision DEFAULT 0,
  area_acres double precision DEFAULT 0,
  crop_type text DEFAULT '',
  planting_date date,
  soil_type text DEFAULT '',
  irrigation_method text DEFAULT '',
  notes text DEFAULT '',
  photo_url text DEFAULT '',
  is_demo boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_farms" ON farms;
CREATE POLICY "select_own_farms" ON farms FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_farms" ON farms;
CREATE POLICY "insert_own_farms" ON farms FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_farms" ON farms;
CREATE POLICY "update_own_farms" ON farms FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_farms" ON farms;
CREATE POLICY "delete_own_farms" ON farms FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Irrigation points table
CREATE TABLE IF NOT EXISTS irrigation_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'drip',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE irrigation_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_irrigation" ON irrigation_points;
CREATE POLICY "select_own_irrigation" ON irrigation_points FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_irrigation" ON irrigation_points;
CREATE POLICY "insert_own_irrigation" ON irrigation_points FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_irrigation" ON irrigation_points;
CREATE POLICY "update_own_irrigation" ON irrigation_points FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_irrigation" ON irrigation_points;
CREATE POLICY "delete_own_irrigation" ON irrigation_points FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Farm activity log
CREATE TABLE IF NOT EXISTS farm_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  details text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE farm_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_activity" ON farm_activity;
CREATE POLICY "select_own_activity" ON farm_activity FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_activity" ON farm_activity;
CREATE POLICY "insert_own_activity" ON farm_activity FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_activity" ON farm_activity;
CREATE POLICY "delete_own_activity" ON farm_activity FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON farms(user_id);
CREATE INDEX IF NOT EXISTS idx_farms_boundary ON farms USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_farms_crop_type ON farms(crop_type);
CREATE INDEX IF NOT EXISTS idx_irrigation_farm_id ON irrigation_points(farm_id);
CREATE INDEX IF NOT EXISTS idx_irrigation_user_id ON irrigation_points(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_farm_id ON farm_activity(farm_id);
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON farm_activity(user_id);

-- Auto-update updated_at on farms
CREATE OR REPLACE FUNCTION update_farm_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_farm_timestamp ON farms;
CREATE TRIGGER trigger_update_farm_timestamp
  BEFORE UPDATE ON farms
  FOR EACH ROW
  EXECUTE FUNCTION update_farm_timestamp();