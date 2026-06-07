-- Cuotas y mes de inicio opcional para deudas

ALTER TABLE debts
  ADD COLUMN installment_count integer NOT NULL DEFAULT 1
  CHECK (installment_count >= 1);

ALTER TABLE debts
  ALTER COLUMN pay_year_month DROP NOT NULL;

ALTER TABLE debts
  DROP CONSTRAINT IF EXISTS debts_pay_year_month_check;

ALTER TABLE debts
  ADD CONSTRAINT debts_pay_year_month_check
  CHECK (pay_year_month IS NULL OR pay_year_month ~ '^\d{4}-\d{2}$');
