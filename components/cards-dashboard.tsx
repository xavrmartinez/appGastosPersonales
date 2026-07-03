"use client";

import { useCallback, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { CardChargeFormDialog } from "@/components/card-charge-form-dialog";
import { CardFormDialog } from "@/components/card-form-dialog";
import { MonthPicker } from "@/components/month-picker";
import {
  fetchAllCardsWithCharges,
  setCardMonthPaid,
} from "@/lib/cards/actions";
import { allCardsKey } from "@/lib/cards/swr";
import {
  chargeAppliesToMonth,
  getInstallmentIndex,
  getMonthAmount,
} from "@/lib/cards/utils";
import { formatCurrency } from "@/lib/format/currency";
import { getCurrentYearMonth } from "@/lib/format/month";
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

function formatDayMonth(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length !== 3) {
    return isoDate;
  }
  return `${parts[2]}/${parts[1]}`;
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
  const [activeMonth, setActiveMonth] = useState(initialYearMonth);

  const handleMonthChange = useCallback((yearMonth: string) => {
    setActiveMonth(yearMonth);
    syncMonthToUrl(yearMonth);
  }, []);

  const payload = data ?? initialData;
  const cards = payload.cards;
  const paidSet = new Set(
    payload.paidFlags.map((flag) => `${flag.cardId}|${flag.yearMonth}`),
  );

  function isCardPaid(cardId: string): boolean {
    return paidSet.has(`${cardId}|${activeMonth}`);
  }

  function handleTogglePaid(cardId: string, nextPaid: boolean) {
    void mutate(
      allCardsKey(),
      (current: AllCardsPayload | undefined) => {
        if (!current) {
          return current;
        }
        const withoutFlag = current.paidFlags.filter(
          (flag) => !(flag.cardId === cardId && flag.yearMonth === activeMonth),
        );
        return {
          ...current,
          paidFlags: nextPaid
            ? [...withoutFlag, { cardId, yearMonth: activeMonth }]
            : withoutFlag,
        };
      },
      { revalidate: false },
    );
    void setCardMonthPaid(cardId, activeMonth, nextPaid);
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
            const paid = isCardPaid(card.id);

            return (
              <section
                key={card.id}
                className={cn("space-y-3", paid && "opacity-60")}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {monthCharges.length > 0 && (
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 cursor-pointer"
                        checked={paid}
                        onChange={(event) =>
                          handleTogglePaid(card.id, event.target.checked)
                        }
                        aria-label="Marcar tarjeta como pagada"
                        title="Marcar tarjeta como pagada"
                      />
                    )}
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
                    {monthCharges.map((charge) => (
                      <div
                        key={charge.id}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
                      >
                        <span className="shrink-0 whitespace-nowrap text-xs font-medium text-muted-foreground">
                          {formatDayMonth(charge.charge_date)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium">
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
                    ))}
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
