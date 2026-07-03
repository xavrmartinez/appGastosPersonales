-- Fecha de carga de cada gasto de tarjeta (informativa, editable)

ALTER TABLE card_charges ADD COLUMN charge_date date;

UPDATE card_charges SET charge_date = created_at::date WHERE charge_date IS NULL;

ALTER TABLE card_charges ALTER COLUMN charge_date SET DEFAULT CURRENT_DATE;
ALTER TABLE card_charges ALTER COLUMN charge_date SET NOT NULL;
