create
or replace function get_last_tour_per_driver()
returns table (
  driver_id int,
  last_tour date
)
language sql
set search_path = public
as $$
select fahrer_id as driver_id, max(datum) as last_tour
from (select "fahrerA_id" as fahrer_id, datum
      from fahrten
      union all
      select "fahrerB_id" as fahrer_id, datum
      from fahrten) combined
where fahrer_id is not null
group by fahrer_id
    $$;
