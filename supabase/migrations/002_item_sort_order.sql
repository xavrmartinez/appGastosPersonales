-- Orden persistente para ítems recurrentes y mensuales

ALTER TABLE recurring_templates
  ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE monthly_items
  ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

WITH ranked_templates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, type
      ORDER BY created_at ASC
    ) - 1 AS new_sort_order
  FROM recurring_templates
)
UPDATE recurring_templates AS rt
SET sort_order = ranked_templates.new_sort_order
FROM ranked_templates
WHERE rt.id = ranked_templates.id;

WITH ranked_items AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, year_month, type
      ORDER BY created_at ASC
    ) - 1 AS new_sort_order
  FROM monthly_items
)
UPDATE monthly_items AS mi
SET sort_order = ranked_items.new_sort_order
FROM ranked_items
WHERE mi.id = ranked_items.id;
