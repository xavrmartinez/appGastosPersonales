"use client";

import { ItemsSection } from "@/components/items-section";
import type { MonthlyItem } from "@/types/database";

interface ItemsDndBoardProps {
  yearMonth: string;
  incomes: MonthlyItem[];
  expenses: MonthlyItem[];
}

export function ItemsDndBoard({
  yearMonth,
  incomes,
  expenses,
}: ItemsDndBoardProps) {
  return (
    <div className="space-y-8">
      <ItemsSection yearMonth={yearMonth} type="income" items={incomes} />
      <ItemsSection yearMonth={yearMonth} type="expense" items={expenses} />
    </div>
  );
}
