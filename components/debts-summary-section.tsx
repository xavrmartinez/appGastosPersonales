"use client";

import Link from "next/link";
import { useSWRConfig } from "swr";
import { setDebtMonthPaid } from "@/lib/debts/actions";
import { formatCurrency } from "@/lib/format/currency";
import { monthSummaryKey } from "@/lib/monthly/swr";
import { cn } from "@/lib/utils";
import type { DebtMonthEntry, MonthSummary } from "@/types/database";
import { Badge } from "@/components/ui/badge";

interface DebtsSummarySectionProps {
  yearMonth: string;
  debts: DebtMonthEntry[];
  totalDebts: number;
}

export function DebtsSummarySection({
  yearMonth,
  debts,
  totalDebts,
}: DebtsSummarySectionProps) {
  const { mutate } = useSWRConfig();

  function handleTogglePaid(debtId: string, nextPaid: boolean) {
    void mutate(
      monthSummaryKey(yearMonth),
      (current: MonthSummary | undefined) =>
        current
          ? {
              ...current,
              debts: current.debts.map((debt) =>
                debt.id === debtId ? { ...debt, isPaid: nextPaid } : debt,
              ),
            }
          : current,
      { revalidate: false },
    );
    void setDebtMonthPaid(debtId, yearMonth, nextPaid);
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Deudas</h3>
        <p className="text-sm text-muted-foreground">
          Cuotas programadas para este mes. Para cambiar pagos o mes de inicio,
          andá a la solapa{" "}
          <Link href="/deudas" className="font-medium text-primary underline">
            Deudas
          </Link>
          .
        </p>
      </div>

      {debts.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No hay deudas programadas para este mes.
        </p>
      ) : (
        <div className="space-y-2">
          {debts.map((debt) => {
            const isPaid = debt.isPaid || debt.isPaidGlobal;
            return (
              <div
                key={debt.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3",
                  isPaid && "opacity-60",
                )}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 cursor-pointer"
                  checked={isPaid}
                  disabled={debt.isPaidGlobal}
                  onChange={(event) =>
                    handleTogglePaid(debt.id, event.target.checked)
                  }
                  aria-label="Marcar como pagado"
                  title={
                    debt.isPaidGlobal
                      ? "Pagada del todo (desde Deudas)"
                      : "Marcar como pagado"
                  }
                />
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <p
                    className={cn(
                      "truncate font-medium",
                      isPaid && "line-through",
                    )}
                  >
                    {debt.description}
                  </p>
                  {debt.installmentCount > 1 && (
                    <Badge variant="secondary">
                      Cuota {debt.installmentIndex}/{debt.installmentCount}
                    </Badge>
                  )}
                </div>
                <p className="whitespace-nowrap font-semibold text-orange-600">
                  {formatCurrency(debt.installmentAmount)}
                </p>
              </div>
            );
          })}

          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
            <p className="font-medium">Total deudas del mes</p>
            <p className="font-semibold text-orange-600">
              {formatCurrency(totalDebts)}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
