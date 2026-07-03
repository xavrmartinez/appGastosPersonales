-- El "pagado" de tarjetas pasa de ser por gasto a ser por tarjeta y mes

ALTER TABLE monthly_paid_status
  DROP CONSTRAINT monthly_paid_status_item_type_check,
  ADD CONSTRAINT monthly_paid_status_item_type_check
    CHECK (item_type IN ('debt', 'card'));

DELETE FROM monthly_paid_status WHERE item_type = 'card_charge';
