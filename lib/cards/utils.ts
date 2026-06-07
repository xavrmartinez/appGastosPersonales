import { shiftYearMonth } from "@/lib/format/month";
import type { CardCharge, CardChargeMonthEntry } from "@/types/database";

export function getMonthAmount(charge: CardCharge): number {
  if (charge.charge_type === "fixed") {
    return Number(charge.amount);
  }

  const count = charge.installment_count || 1;
  return Number(charge.amount) / count;
}

export function getAffectedYearMonths(charge: CardCharge): string[] {
  if (charge.charge_type === "fixed" || !charge.pay_year_month) {
    return [];
  }

  return Array.from({ length: charge.installment_count }, (_, index) =>
    shiftYearMonth(charge.pay_year_month!, index),
  );
}

export function chargeAppliesToMonth(
  charge: CardCharge,
  yearMonth: string,
): boolean {
  if (charge.charge_type === "fixed") {
    return true;
  }

  if (!charge.pay_year_month) {
    return false;
  }

  const endMonth = shiftYearMonth(
    charge.pay_year_month,
    charge.installment_count - 1,
  );

  return yearMonth >= charge.pay_year_month && yearMonth <= endMonth;
}

export function getInstallmentIndex(
  charge: CardCharge,
  yearMonth: string,
): number {
  if (
    charge.charge_type !== "installment" ||
    !charge.pay_year_month ||
    !chargeAppliesToMonth(charge, yearMonth)
  ) {
    return 0;
  }

  const [startYear, startMonth] = charge.pay_year_month.split("-").map(Number);
  const [targetYear, targetMonth] = yearMonth.split("-").map(Number);
  const monthDiff =
    (targetYear - startYear) * 12 + (targetMonth - startMonth);

  return monthDiff + 1;
}

export function toCardChargeMonthEntry(
  charge: CardCharge,
  cardName: string,
  yearMonth: string,
): CardChargeMonthEntry {
  const entry: CardChargeMonthEntry = {
    id: charge.id,
    cardId: charge.card_id,
    cardName,
    description: charge.description,
    chargeType: charge.charge_type,
    monthAmount: getMonthAmount(charge),
    totalAmount: Number(charge.amount),
  };

  if (charge.charge_type === "installment") {
    entry.installmentIndex = getInstallmentIndex(charge, yearMonth);
    entry.installmentCount = charge.installment_count;
  }

  return entry;
}

export function getCardMonthlyTotal(charges: CardCharge[]): number {
  return charges.reduce((sum, charge) => {
    if (charge.charge_type === "installment" && !charge.pay_year_month) {
      return sum;
    }
    return sum + getMonthAmount(charge);
  }, 0);
}

export function getChargeScheduleLabel(charge: CardCharge): string {
  if (charge.charge_type === "fixed") {
    return "Fijo";
  }

  if (!charge.pay_year_month) {
    return "Sin mes asignado";
  }

  if (charge.installment_count === 1) {
    return "1 cuota";
  }

  return `${charge.installment_count} cuotas`;
}
