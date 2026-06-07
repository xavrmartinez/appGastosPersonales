import type { MonthSummary } from "@/types/database";

export function monthSummaryKey(yearMonth: string) {
  return ["month-summary", yearMonth] as const;
}

export function emptySummaryFor(yearMonth: string): MonthSummary {
  return {
    yearMonth,
    incomes: [],
    expenses: [],
    debts: [],
    cards: [],
    totalIncome: 0,
    totalExpense: 0,
    totalDebts: 0,
    totalCards: 0,
    balance: 0,
  };
}
