-- Estado "pagado" (solo informativo, no afecta balances)

-- Gastos/ingresos: ya son por mes, alcanza con una columna
ALTER TABLE monthly_items
  ADD COLUMN is_paid boolean NOT NULL DEFAULT false;

-- Deudas: check global "ya la pague del todo"
ALTER TABLE debts
  ADD COLUMN is_paid boolean NOT NULL DEFAULT false;

-- Flags de pago por mes para entidades globales (deudas y cargos de tarjeta),
-- que se calculan por mes y no tienen fila por mes en su tabla base.
CREATE TABLE monthly_paid_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('debt', 'card_charge')),
  item_id uuid NOT NULL,
  year_month text NOT NULL CHECK (year_month ~ '^\d{4}-\d{2}$'),
  is_paid boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_type, item_id, year_month)
);

CREATE INDEX idx_monthly_paid_status_lookup
  ON monthly_paid_status (user_id, item_type, year_month);

ALTER TABLE monthly_paid_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own paid status"
  ON monthly_paid_status
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
