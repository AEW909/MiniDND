-- Move all MiniDND tables from public to dnd schema.
-- This separates MiniDND from RugbyMove on the shared Supabase project;
-- RugbyMove tables will live in public, MiniDND tables live here in dnd.

CREATE SCHEMA IF NOT EXISTS dnd;

GRANT USAGE ON SCHEMA dnd TO anon, authenticated, service_role;

-- Move in dependency order: parent tables before children
ALTER TABLE public.parties SET SCHEMA dnd;
ALTER TABLE public.characters SET SCHEMA dnd;
ALTER TABLE public.character_skills SET SCHEMA dnd;
ALTER TABLE public.character_attacks SET SCHEMA dnd;
ALTER TABLE public.character_spells SET SCHEMA dnd;
ALTER TABLE public.character_spell_slots SET SCHEMA dnd;
ALTER TABLE public.character_inventory SET SCHEMA dnd;
ALTER TABLE public.character_other SET SCHEMA dnd;
ALTER TABLE public.encounters SET SCHEMA dnd;

-- Re-enable RLS (survives schema move but explicit for clarity)
ALTER TABLE dnd.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE dnd.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE dnd.character_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE dnd.character_attacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dnd.character_spells ENABLE ROW LEVEL SECURITY;
ALTER TABLE dnd.character_spell_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE dnd.character_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE dnd.character_other ENABLE ROW LEVEL SECURITY;
ALTER TABLE dnd.encounters ENABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA dnd TO anon, authenticated, service_role;

-- Ensure realtime publication entries reflect the new schema.
-- Publication membership tracks by OID and survives schema moves;
-- this is a safety net in case Supabase infrastructure needs an explicit refresh.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['characters', 'character_spell_slots', 'character_inventory', 'character_other', 'encounters']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'dnd' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE dnd.%I', t);
    END IF;
  END LOOP;
END $$;
