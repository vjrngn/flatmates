-- Add title, description, and source_url columns to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS source_url text;

-- Add unique constraint to source_url to prevent duplicate web listings
-- This allows multiple NULL values for manual listings but ensures unique URLs for web-scraped ones
CREATE UNIQUE INDEX IF NOT EXISTS listings_source_url_idx ON listings (source_url) WHERE source_url IS NOT NULL;

-- Update the get_listings_with_coords function to include the new columns
DROP FUNCTION IF EXISTS get_listings_with_coords(float8, float8, float8);

CREATE OR REPLACE FUNCTION get_listings_with_coords(
  search_lat float8 DEFAULT NULL,
  search_lng float8 DEFAULT NULL,
  radius_meters float8 DEFAULT 5000
)
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
  created_at timestamptz,
  title text,
  description text,
  source_url text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.user_id,
    extensions.ST_Y(l.location::extensions.geometry) as lat,
    extensions.ST_X(l.location::extensions.geometry) as lng,
    l.bhk_type,
    l.rent,
    l.amenities,
    l.occupancy_rules,
    l.is_verified,
    l.created_at,
    l.title,
    l.description,
    l.source_url
  FROM listings l
  WHERE 
    (search_lat IS NULL OR search_lng IS NULL) OR
    extensions.ST_DWithin(
      l.location, 
      extensions.ST_SetSRID(extensions.ST_MakePoint(search_lng, search_lat), 4326)::extensions.geography, 
      radius_meters
    );
END;
$$ LANGUAGE plpgsql STABLE;
