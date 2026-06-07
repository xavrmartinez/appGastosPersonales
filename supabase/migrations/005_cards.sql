-- Tarjetas de crédito y gastos asociados (fijos o en cuotas)

CREATE TYPE card_charge_type AS ENUM ('fixed', 'installment');

CREATE TABLE credit_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE card_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  charge_type card_charge_type NOT NULL,
  pay_year_month text CHECK (pay_year_month IS NULL OR pay_year_month ~ '^\d{4}-\d{2}$'),
  installment_count integer NOT NULL DEFAULT 1 CHECK (installment_count >= 1),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_cards_user ON credit_cards (user_id);
CREATE INDEX idx_card_charges_user_card ON card_charges (user_id, card_id);

ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own credit cards"
  ON credit_cards
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own card charges"
  ON card_charges
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
