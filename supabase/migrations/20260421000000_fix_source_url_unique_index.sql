-- Drop the partial unique index that was causing ON CONFLICT issues
DROP INDEX IF EXISTS listings_source_url_idx;

-- Create a standard unique index on source_url
-- PostgreSQL unique indexes allow multiple NULL values by default, 
-- which satisfies the requirement for manual listings without URLs.
CREATE UNIQUE INDEX listings_source_url_idx ON listings (source_url);
