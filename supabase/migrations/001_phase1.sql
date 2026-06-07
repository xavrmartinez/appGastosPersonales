-- Fase 1: gastos e ingresos mensuales

CREATE TYPE item_type AS ENUM ('expense', 'income');
CREATE TYPE item_source AS ENUM ('recurring', 'one_off');

CREATE TABLE recurring_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type item_type NOT NULL,
  description text NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE monthly_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year_month text NOT NULL CHECK (year_month ~ '^\d{4}-\d{2}$'),
  type item_type NOT NULL,
  description text NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  source item_source NOT NULL,
  recurring_template_id uuid REFERENCES recurring_templates(id) ON DELETE SET NULL,
  is_modified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, year_month, recurring_template_id)
);

CREATE INDEX idx_recurring_templates_user_active ON recurring_templates (user_id, active);
CREATE INDEX idx_monthly_items_user_month ON monthly_items (user_id, year_month);

ALTER TABLE recurring_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recurring templates"
  ON recurring_templates
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own monthly items"
  ON monthly_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
