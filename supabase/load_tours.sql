CREATE
OR REPLACE FUNCTION load_tours()
RETURNS TABLE (
  id integer,
  datum date,
  fahrerA_id integer,
  fahrerB_id integer,
  anwesend_ids jsonb,
  max_datum date
)
LANGUAGE sql
set search_path = public
AS $$
SELECT f.id,
       f.datum,
       f."fahrerA_id",
       f."fahrerB_id",
       f."anwesend_ids",
       (SELECT MAX(datum) FROM fahrten) AS max_datum
FROM fahrten f
ORDER BY datum ASC
    $$;
