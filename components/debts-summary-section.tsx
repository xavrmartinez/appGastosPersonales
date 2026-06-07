import Link from "next/link";
import { formatCurrency } from "@/lib/format/currency";
import type { DebtMonthEntry } from "@/types/database";
import { Badge } from "@/components/ui/badge";

interface DebtsSummarySectionProps {
  debts: DebtMonthEntry[];
  totalDebts: number;
}

export function DebtsSummarySection({
  debts,
  totalDebts,
}: DebtsSummarySectionProps) {
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
          {debts.map((debt) => (
            <div
              key={debt.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
            >
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <p className="truncate font-medium">{debt.description}</p>
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
          ))}

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
