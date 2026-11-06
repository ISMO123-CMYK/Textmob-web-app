-- Markdown content format for Textmob posts.
-- Apply to SUPABASE_2_URL / SUPABASE_2_KEY (Posts database).
-- With TEXTDB_ENABLED=true, supabase and supabase2 share TextDB; do not run this SQL.

ALTER TABLE public."Posts"
  ADD COLUMN IF NOT EXISTS content_format text NOT NULL DEFAULT 'legacy';

COMMENT ON COLUMN public."Posts".content_format IS
  'markdown for new Markdown and MobUI posts; legacy for earlier stored HTML content.';
