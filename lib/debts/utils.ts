import { shiftYearMonth } from "@/lib/format/month";
import type { Debt, DebtMonthEntry } from "@/types/database";

export function getInstallmentAmount(debt: Debt): number {
  const count = debt.installment_count || 1;
  return Number(debt.amount) / count;
}

export function getAffectedYearMonths(debt: Debt): string[] {
  if (!debt.pay_year_month) {
    return [];
  }

  return Array.from({ length: debt.installment_count }, (_, index) =>
    shiftYearMonth(debt.pay_year_month!, index),
  );
}

export function debtAppliesToMonth(debt: Debt, yearMonth: string): boolean {
  if (!debt.pay_year_month) {
    return false;
  }

  const endIndex = debt.installment_count - 1;
  const startMonth = debt.pay_year_month;
  const endMonth = shiftYearMonth(startMonth, endIndex);

  return yearMonth >= startMonth && yearMonth <= endMonth;
}

export function getInstallmentIndex(debt: Debt, yearMonth: string): number {
  if (!debt.pay_year_month || !debtAppliesToMonth(debt, yearMonth)) {
    return 0;
  }

  const [startYear, startMonth] = debt.pay_year_month.split("-").map(Number);
  const [targetYear, targetMonth] = yearMonth.split("-").map(Number);
  const monthDiff =
    (targetYear - startYear) * 12 + (targetMonth - startMonth);

  return monthDiff + 1;
}

export function toDebtMonthEntry(debt: Debt, yearMonth: string): DebtMonthEntry {
  return {
    id: debt.id,
    description: debt.description,
    totalAmount: Number(debt.amount),
    installmentAmount: getInstallmentAmount(debt),
    installmentIndex: getInstallmentIndex(debt, yearMonth),
    installmentCount: debt.installment_count,
  };
}
