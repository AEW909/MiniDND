-- Initiative encounter state, one row per party
-- party_id is the PK so there is at most one encounter record per party
CREATE TABLE encounters (
  party_id   uuid PRIMARY KEY REFERENCES parties(id) ON DELETE CASCADE,
  is_active  boolean NOT NULL DEFAULT false,
  round      integer NOT NULL DEFAULT 1,
  current_id text,
  entries    jsonb NOT NULL DEFAULT '[]'
);

-- Required for Supabase Realtime to broadcast full row on UPDATE
ALTER TABLE encounters REPLICA IDENTITY FULL;

-- Add to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE encounters;
