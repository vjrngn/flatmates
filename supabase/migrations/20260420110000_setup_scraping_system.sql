-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pgmq CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create scraping configurations table
CREATE TABLE IF NOT EXISTS scraping_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  site_name text NOT NULL,
  search_query_template text NOT NULL, -- e.g. "rental listings in {city} on {site_name}"
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed with Bangalore
INSERT INTO scraping_configs (city, site_name, search_query_template)
VALUES 
  ('Bangalore', 'NoBroker', 'flats for rent in {city} on NoBroker'),
  ('Bangalore', 'Housing.com', 'apartments for rent in {city} on Housing.com')
ON CONFLICT DO NOTHING;

-- Create the pgmq queue
SELECT pgmq.create('scraping_jobs');

-- Dispatcher function: Reads from configs and enqueues jobs
CREATE OR REPLACE FUNCTION dispatch_scraping_jobs()
RETURNS void AS $$
DECLARE
  config RECORD;
BEGIN
  FOR config IN SELECT * FROM scraping_configs WHERE is_active = true LOOP
    PERFORM pgmq.send(
      'scraping_jobs',
      jsonb_build_object(
        'city', config.city,
        'site_name', config.site_name,
        'query', replace(replace(config.search_query_template, '{city}', config.city), '{site_name}', config.site_name)
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Worker trigger: Reads from queue and calls Edge Function
-- Note: We do NOT delete the job here. The worker must call back to delete it via pgmq.delete.
CREATE OR REPLACE FUNCTION process_scraping_queue()
RETURNS void AS $$
DECLARE
  job RECORD;
  edge_url text := current_setting('app.settings.edge_url', true);
  service_key text := current_setting('app.settings.service_role_key', true);
BEGIN
  IF edge_url IS NULL OR edge_url = '' THEN
    RAISE WARNING 'app.settings.edge_url is not set. Skipping queue processing.';
    RETURN;
  END IF;

  -- Read 1 job from the queue and set visibility timeout to 10 minutes (600s)
  FOR job IN SELECT * FROM pgmq.read('scraping_jobs', 600, 1) LOOP
    PERFORM net.http_post(
      url := edge_url || '/functions/v1/scrape-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object(
        'job_id', job.msg_id,
        'payload', job.msg_content
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule the dispatcher to run daily at midnight
SELECT cron.schedule(
  'dispatch-scrapers',
  '0 0 * * *',
  'SELECT dispatch_scraping_jobs();'
);

-- Schedule the worker trigger to run every 5 minutes
SELECT cron.schedule(
  'run-scraping-worker',
  '*/5 * * * *',
  'SELECT process_scraping_queue();'
);

-- Atomic Ingestion Function
-- Handles listing upsert and job deletion in one transaction
CREATE OR REPLACE FUNCTION ingest_scraped_listings(
  p_listings jsonb,
  p_job_id bigint
)
RETURNS void AS $$
DECLARE
  l RECORD;
BEGIN
  -- 1. Upsert listings
  FOR l IN SELECT * FROM jsonb_to_recordset(p_listings) AS x(
    title text,
    description text,
    rent numeric,
    bhk_type text,
    amenities text[],
    source_url text,
    lat float8,
    lng float8
  ) LOOP
    INSERT INTO listings (
      title, description, rent, bhk_type, amenities, source_url, location
    ) VALUES (
      l.title, l.description, l.rent, l.bhk_type, l.amenities, l.source_url, 
      extensions.ST_SetSRID(extensions.ST_MakePoint(l.lng, l.lat), 4326)::extensions.geography
    )
    ON CONFLICT (source_url) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      rent = EXCLUDED.rent,
      bhk_type = EXCLUDED.bhk_type,
      amenities = EXCLUDED.amenities,
      updated_at = now();
  END LOOP;

  -- 2. Delete job from queue
  PERFORM pgmq.delete('scraping_jobs', p_job_id);
END;
$$ LANGUAGE plpgsql;
