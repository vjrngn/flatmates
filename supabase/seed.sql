-- Seed a test user into Auth and Profiles
-- Note: In Supabase local, we can insert directly into auth.users for testing
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'test@example.com', '{"full_name": "Test User"}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, full_name)
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'Test User')
ON CONFLICT (id) DO NOTHING;

-- Seed some dummy listings around Bangalore center (12.9716, 77.5946)
INSERT INTO listings (user_id, location, bhk_type, rent, amenities, occupancy_rules)
VALUES 
  (
    '00000000-0000-0000-0000-000000000000', 
    ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326)::geography, 
    '1BHK', 
    15000, 
    ARRAY['security', 'power_backup'], 
    '{"diet": "veg", "pets": false, "gender": "any"}'
  ),
  (
    '00000000-0000-0000-0000-000000000000', 
    ST_SetSRID(ST_MakePoint(77.6000, 12.9800), 4326)::geography, 
    '2BHK', 
    25000, 
    ARRAY['security', 'pool', 'gym'], 
    '{"diet": "any", "pets": true, "gender": "female"}'
  ),
  (
    '00000000-0000-0000-0000-000000000000', 
    ST_SetSRID(ST_MakePoint(77.5800, 12.9600), 4326)::geography, 
    '1RK', 
    8000, 
    ARRAY['wifi'], 
    '{"diet": "any", "pets": false, "gender": "male"}'
  ),
  (
    '00000000-0000-0000-0000-000000000000', 
    ST_SetSRID(ST_MakePoint(77.6100, 12.9500), 4326)::geography, 
    '3BHK', 
    45000, 
    ARRAY['security', 'gated_community', 'parking'], 
    '{"diet": "any", "pets": true, "gender": "any"}'
  );
