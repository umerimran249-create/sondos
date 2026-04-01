-- Add quote_token column to quotes for accept/reject email response links
alter table quotes
  add column if not exists quote_token text unique;

-- Add payment_type column if it doesn't exist yet
alter table quotes
  add column if not exists payment_type text;

-- Index for fast token lookups
create index if not exists idx_quotes_token on quotes (quote_token);
