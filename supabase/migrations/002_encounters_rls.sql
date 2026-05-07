ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;

CREATE POLICY anon_all_encounters
  ON encounters
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
