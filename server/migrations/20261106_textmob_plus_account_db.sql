-- Textmob Plus reward ledger and MobUI poll storage.
-- Apply to SUPABASE_URL / SUPABASE_KEY (users + verification_requests database).
-- With TEXTDB_ENABLED=true, TextDB creates these tables dynamically; do not run this SQL.

CREATE TABLE IF NOT EXISTS public.mobcoin_reward_events (
  id text PRIMARY KEY,
  post_id text NOT NULL,
  author_username text NOT NULL,
  milestone_likes integer NOT NULL CHECK (milestone_likes > 0),
  amount integer NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS mobcoin_reward_events_author_created_idx
  ON public.mobcoin_reward_events (author_username, created_at DESC);

CREATE TABLE IF NOT EXISTS public.mobui_poll_votes (
  id text PRIMARY KEY,
  post_id text NOT NULL,
  block_id text NOT NULL,
  username text NOT NULL,
  option_index integer NOT NULL CHECK (option_index >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mobui_poll_votes_one_per_user UNIQUE (post_id, block_id, username)
);

CREATE INDEX IF NOT EXISTS mobui_poll_votes_post_block_idx
  ON public.mobui_poll_votes (post_id, block_id);

ALTER TABLE public.mobcoin_reward_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobui_poll_votes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.mobcoin_reward_events FROM anon, authenticated;
REVOKE ALL ON public.mobui_poll_votes FROM anon, authenticated;
GRANT ALL ON public.mobcoin_reward_events TO service_role;
GRANT ALL ON public.mobui_poll_votes TO service_role;
