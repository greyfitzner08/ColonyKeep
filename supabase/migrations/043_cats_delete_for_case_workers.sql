-- Let case workers remove tracked cats they manage (not just admins).

DROP POLICY IF EXISTS "Admins delete cats" ON cats;
DROP POLICY IF EXISTS "Staff delete cats" ON cats;

CREATE POLICY "Staff delete cats" ON cats FOR DELETE USING (
  is_case_worker()
);
