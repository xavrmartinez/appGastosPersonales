"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { BalanceSummary } from "@/components/balance-summary";
import { CardsSummarySection } from "@/components/cards-summary-section";
import { DebtsSummarySection } from "@/components/debts-summary-section";
import { ItemsDndBoard } from "@/components/items-dnd-board";
import { MonthPicker } from "@/components/month-picker";
import { getCurrentYearMonth } from "@/lib/format/month";
import {
  ensureMonthAndFetchItems,
  fetchYearSummaries,
} from "@/lib/monthly/actions";
import { emptySummaryFor, monthSummaryKey } from "@/lib/monthly/swr";
import type { MonthSummary } from "@/types/database";

interface ResumenDashboardProps {
  initialYearMonth: string;
  initialSummary: MonthSummary;
}

function syncMonthToUrl(yearMonth: string) {
  const url =
    yearMonth === getCurrentYearMonth() ? "/" : `/?month=${yearMonth}`;
  window.history.replaceState(null, "", url);
}

function getDisplaySummary(
  activeMonth: string,
  data: MonthSummary | undefined,
): MonthSummary {
  if (data?.yearMonth === activeMonth) {
    return data;
  }

  return emptySummaryFor(activeMonth);
}

export function ResumenDashboard({
  initialYearMonth,
  initialSummary,
}: ResumenDashboardProps) {
  const [activeMonth, setActiveMonth] = useState(initialYearMonth);
  const { mutate: globalMutate } = useSWRConfig();

  const { data } = useSWR(
    monthSummaryKey(activeMonth),
    () => ensureMonthAndFetchItems(activeMonth),
    {
      fallbackData:
        activeMonth === initialYearMonth ? initialSummary : undefined,
      revalidateIfStale: false,
      revalidateOnMount: false,
      revalidateOnReconnect: false,
    },
  );

  const summary = getDisplaySummary(activeMonth, data);
  const monthDebts = summary.debts.filter(
    (debt) =>
      Number.isFinite(debt.installmentAmount) && debt.installmentAmount > 0,
  );
  const hasMonthDebts = monthDebts.length > 0;
  const totalDebts = hasMonthDebts
    ? monthDebts.reduce((sum, debt) => sum + debt.installmentAmount, 0)
    : 0;
  const monthCards = (summary.cards ?? []).filter(
    (card) => Number.isFinite(card.monthAmount) && card.monthAmount > 0,
  );
  const hasMonthCards = monthCards.length > 0;
  const totalCards = hasMonthCards
    ? monthCards.reduce((sum, card) => sum + card.monthAmount, 0)
    : 0;
  const balance =
    summary.totalIncome - summary.totalExpense - totalDebts - totalCards;

  const handleMonthChange = useCallback((yearMonth: string) => {
    setActiveMonth(yearMonth);
    syncMonthToUrl(yearMonth);
  }, []);

  const loadedYears = useRef<Set<number>>(new Set());

  useEffect(() => {
    const year = Number(activeMonth.split("-")[0]);

    if (loadedYears.current.has(year)) {
      return;
    }
    loadedYears.current.add(year);

    void fetchYearSummaries(year).then((summaries) => {
      for (const [yearMonth, monthSummary] of Object.entries(summaries)) {
        void globalMutate(monthSummaryKey(yearMonth), monthSummary, {
          revalidate: false,
        });
      }
    });
  }, [activeMonth, globalMutate]);

  return (
    <div className="space-y-8">
      <MonthPicker yearMonth={activeMonth} onMonthChange={handleMonthChange} />
      <BalanceSummary
        totalIncome={summary.totalIncome}
        totalExpense={summary.totalExpense}
        totalDebts={totalDebts}
        totalCards={totalCards}
        balance={balance}
        showDebts={hasMonthDebts}
        showCards={hasMonthCards}
      />
      <ItemsDndBoard
        yearMonth={activeMonth}
        incomes={summary.incomes}
        expenses={summary.expenses}
      />
      {hasMonthDebts && (
        <DebtsSummarySection debts={monthDebts} totalDebts={totalDebts} />
      )}
      {hasMonthCards && (
        <CardsSummarySection cards={monthCards} totalCards={totalCards} />
      )}
    </div>
  );
}
