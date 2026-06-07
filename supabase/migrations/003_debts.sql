-- Deudas con mes de pago asignado

CREATE TABLE debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  pay_year_month text NOT NULL CHECK (pay_year_month ~ '^\d{4}-\d{2}$'),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_debts_user_pay_month ON debts (user_id, pay_year_month);

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own debts"
  ON debts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
