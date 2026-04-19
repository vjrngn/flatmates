-- Enable PostGIS extension for geographic queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Profiles table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  updated_at timestamptz DEFAULT now()
);

-- Listings table
CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Geographic point (SRID 4326 is standard WGS84)
  location geography(point, 4326) NOT NULL,
  
  -- Details
  bhk_type text NOT NULL, -- e.g. '1RK', '1BHK', '2BHK', '3BHK', 'Shared'
  rent numeric NOT NULL,
  amenities text[] DEFAULT '{}', -- e.g. ['security', 'pool', 'gym']
  
  -- Flexible storage for Indian context filters
  -- { "diet": "veg", "pets": false, "religion": "any", "unmarried": "allowed" }
  occupancy_rules jsonb DEFAULT '{}',
  
  -- Verification fields for agentic flow
  is_verified boolean DEFAULT false,
  verification_metadata jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast proximity searches
CREATE INDEX IF NOT EXISTS listings_location_idx ON listings USING GIST (location);

-- Function to get listings with lat/lng for the map
CREATE OR REPLACE FUNCTION get_listings_with_coords()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  lat float8,
  lng float8,
  bhk_type text,
  rent numeric,
  amenities text[],
  occupancy_rules jsonb,
  is_verified boolean,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.user_id,
    ST_Y(l.location::geometry) as lat,
    ST_X(l.location::geometry) as lng,
    l.bhk_type,
    l.rent,
    l.amenities,
    l.occupancy_rules,
    l.is_verified,
    l.created_at
  FROM listings l;
END;
$$ LANGUAGE plpgsql STABLE;

-- Automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
