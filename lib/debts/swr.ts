import type { Debt } from "@/types/database";

export function allDebtsKey() {
  return ["all-debts"] as const;
}

export function emptyDebtsList(): Debt[] {
  return [];
}
