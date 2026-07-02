"use client";

import { useCallback, useState, useTransition } from "react";
import useSWR, { useSWRConfig } from "swr";
import { CardChargeFormDialog } from "@/components/card-charge-form-dialog";
import { CardFormDialog } from "@/components/card-form-dialog";
import { MonthPicker } from "@/components/month-picker";
import {
  fetchAllCardsWithCharges,
  setCardChargeMonthPaid,
} from "@/lib/cards/actions";
import { allCardsKey } from "@/lib/cards/swr";
import {
  chargeAppliesToMonth,
  getInstallmentIndex,
  getMonthAmount,
} from "@/lib/cards/utils";
import { formatCurrency } from "@/lib/format/currency";
import { getCurrentYearMonth } from "@/lib/format/month";
import { monthSummaryKey } from "@/lib/monthly/swr";
import { cn } from "@/lib/utils";
import type { AllCardsPayload, CardCharge } from "@/types/database";
import { Badge } from "@/components/ui/badge";

function getChargeBadgeLabel(charge: CardCharge, yearMonth: string): string {
  if (charge.charge_type === "fixed") {
    return "Fijo";
  }

  return `Cuota ${getInstallmentIndex(charge, yearMonth)}/${charge.installment_count}`;
}

function getMonthTotal(charges: CardCharge[]): number {
  return charges.reduce((sum, charge) => sum + getMonthAmount(charge), 0);
}

function syncMonthToUrl(yearMonth: string) {
  const url =
    yearMonth === getCurrentYearMonth()
      ? "/tarjetas"
      : `/tarjetas?month=${yearMonth}`;
  window.history.replaceState(null, "", url);
}

interface CardsDashboardProps {
  initialData: AllCardsPayload;
  initialYearMonth: string;
}

export function CardsDashboard({
  initialData,
  initialYearMonth,
}: CardsDashboardProps) {
  const { data } = useSWR(allCardsKey(), fetchAllCardsWithCharges, {
    fallbackData: initialData,
    revalidateIfStale: false,
    revalidateOnMount: false,
    revalidateOnReconnect: false,
  });

  const { mutate } = useSWRConfig();
  const [, startTransition] = useTransition();
  const [activeMonth, setActiveMonth] = useState(initialYearMonth);

  const handleMonthChange = useCallback((yearMonth: string) => {
    setActiveMonth(yearMonth);
    syncMonthToUrl(yearMonth);
  }, []);

  const payload = data ?? initialData;
  const cards = payload.cards;
  const paidSet = new Set(
    payload.paidFlags.map((flag) => `${flag.chargeId}|${flag.yearMonth}`),
  );

  function isChargePaid(chargeId: string): boolean {
    return paidSet.has(`${chargeId}|${activeMonth}`);
  }

  function handleTogglePaid(chargeId: string, nextPaid: boolean) {
    startTransition(async () => {
      await setCardChargeMonthPaid(chargeId, activeMonth, nextPaid);
      await mutate(allCardsKey());
      await mutate(monthSummaryKey(activeMonth));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Tarjetas</h2>
          <p className="text-sm text-muted-foreground">
            Agregá tarjetas y sus gastos fijos o en cuotas. Se reflejan en el
            resumen mensual.
          </p>
        </div>
        <CardFormDialog variant="add" />
      </div>

      <MonthPicker yearMonth={activeMonth} onMonthChange={handleMonthChange} />

      {cards.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Todavía no hay tarjetas registradas.
        </p>
      ) : (
        <div className="space-y-6">
          {cards.map((card) => {
            const monthCharges = card.charges.filter((charge) =>
              chargeAppliesToMonth(charge, activeMonth),
            );

            return (
              <section key={card.id} className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{card.name}</h3>
                    {monthCharges.length > 0 && (
                      <span className="text-sm font-semibold text-violet-600">
                        {formatCurrency(getMonthTotal(monthCharges))}/mes
                      </span>
                    )}
                    <CardFormDialog card={card} variant="edit" />
                  </div>
                  <CardChargeFormDialog cardId={card.id} variant="add" />
                </div>

                {monthCharges.length === 0 ? (
                  <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                    Esta tarjeta no tiene gastos este mes.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {monthCharges.map((charge) => {
                      const paid = isChargePaid(charge.id);
                      return (
                        <div
                          key={charge.id}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3",
                            paid && "opacity-60",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 shrink-0 cursor-pointer"
                            checked={paid}
                            onChange={(event) =>
                              handleTogglePaid(charge.id, event.target.checked)
                            }
                            aria-label="Marcar como pagado"
                            title="Marcar como pagado"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p
                                className={cn(
                                  "truncate font-medium",
                                  paid && "line-through",
                                )}
                              >
                                {charge.description}
                              </p>
                              <Badge variant="secondary">
                                {getChargeBadgeLabel(charge, activeMonth)}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <p className="whitespace-nowrap font-semibold">
                              {formatCurrency(getMonthAmount(charge))}
                            </p>
                            <CardChargeFormDialog
                              cardId={card.id}
                              charge={charge}
                              variant="edit"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
