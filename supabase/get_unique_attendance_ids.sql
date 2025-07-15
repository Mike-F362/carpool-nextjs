CREATE
OR REPLACE FUNCTION get_unique_attendance_ids()
RETURNS TABLE(anwesend_ids jsonb)
LANGUAGE sql
set search_path = public
AS $$
  WITH alle_ids AS (
    SELECT
      f.id AS fahrt_id,
      (jsonb_array_elements_text(f.anwesend_ids)::int) AS id
    FROM fahrten f
  ),
  gefiltert AS (
    SELECT fahrt_id, id
    FROM alle_ids
    WHERE id NOT IN (SELECT id FROM fahrer WHERE startpunkt = 2)
  ),
  gruppiert AS (
    SELECT fahrt_id, jsonb_agg(id ORDER BY id) AS ids
    FROM gefiltert
    GROUP BY fahrt_id
  )
SELECT DISTINCT ids AS anwesend_ids
FROM gruppiert;
$$;
