"use client";

import useSWR from "swr";
import { DebtFormDialog } from "@/components/debt-form-dialog";
import { fetchAllDebts } from "@/lib/debts/actions";
import { allDebtsKey } from "@/lib/debts/swr";
import { formatCurrency } from "@/lib/format/currency";
import { formatYearMonthLabel, getCurrentYearMonth } from "@/lib/format/month";
import type { Debt } from "@/types/database";
import { Badge } from "@/components/ui/badge";

function getDebtScheduleLabel(debt: Debt): string {
  if (!debt.pay_year_month) {
    return "Sin mes asignado";
  }

  if (debt.installment_count === 1) {
    return `1 pago: ${formatYearMonthLabel(debt.pay_year_month)}`;
  }

  return `${debt.installment_count} cuotas desde ${formatYearMonthLabel(debt.pay_year_month)}`;
}

interface DebtsDashboardProps {
  initialDebts: Debt[];
}

export function DebtsDashboard({ initialDebts }: DebtsDashboardProps) {
  const { data } = useSWR(allDebtsKey(), fetchAllDebts, {
    fallbackData: initialDebts,
    revalidateIfStale: false,
    revalidateOnMount: false,
    revalidateOnReconnect: false,
  });

  const debts = data ?? initialDebts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Deudas</h2>
          <p className="text-sm text-muted-foreground">
            Gestioná tus deudas. Elegí el mes de inicio y, si querés, en cuántas
            cuotas pagarlas.
          </p>
        </div>
        <DebtFormDialog
          variant="add"
          defaultPayYearMonth={getCurrentYearMonth()}
        />
      </div>

      {debts.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Todavía no hay deudas registradas.
        </p>
      ) : (
        <div className="space-y-2">
          {debts.map((debt) => (
            <div
              key={debt.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{debt.description}</p>
                  <Badge
                    variant={debt.pay_year_month ? "secondary" : "outline"}
                  >
                    {getDebtScheduleLabel(debt)}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <p className="whitespace-nowrap font-semibold">
                  {formatCurrency(Number(debt.amount))}
                </p>
                <DebtFormDialog debt={debt} variant="edit" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
