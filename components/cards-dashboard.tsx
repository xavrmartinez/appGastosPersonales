"use client";

import useSWR from "swr";
import { CardChargeFormDialog } from "@/components/card-charge-form-dialog";
import { CardFormDialog } from "@/components/card-form-dialog";
import { fetchAllCardsWithCharges } from "@/lib/cards/actions";
import { allCardsKey } from "@/lib/cards/swr";
import {
  getCardMonthlyTotal,
  getChargeScheduleLabel,
} from "@/lib/cards/utils";
import { formatCurrency } from "@/lib/format/currency";
import { formatYearMonthLabel } from "@/lib/format/month";
import type { CardCharge } from "@/types/database";
import { Badge } from "@/components/ui/badge";

function getChargeBadgeLabel(charge: CardCharge): string {
  if (charge.charge_type === "fixed") {
    return `Fijo · ${formatCurrency(Number(charge.amount))}/mes`;
  }

  const schedule = getChargeScheduleLabel(charge);
  if (!charge.pay_year_month) {
    return schedule;
  }

  return `${schedule} desde ${formatYearMonthLabel(charge.pay_year_month)}`;
}

interface CardsDashboardProps {
  initialCards: Awaited<ReturnType<typeof fetchAllCardsWithCharges>>;
}

export function CardsDashboard({ initialCards }: CardsDashboardProps) {
  const { data } = useSWR(allCardsKey(), fetchAllCardsWithCharges, {
    fallbackData: initialCards,
    revalidateIfStale: false,
    revalidateOnMount: false,
    revalidateOnReconnect: false,
  });

  const cards = data ?? initialCards;

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

      {cards.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Todavía no hay tarjetas registradas.
        </p>
      ) : (
        <div className="space-y-6">
          {cards.map((card) => (
            <section key={card.id} className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{card.name}</h3>
                  {card.charges.length > 0 && (
                    <span className="text-sm font-semibold text-violet-600">
                      {formatCurrency(getCardMonthlyTotal(card.charges))}/mes
                    </span>
                  )}
                  <CardFormDialog card={card} variant="edit" />
                </div>
                <CardChargeFormDialog cardId={card.id} variant="add" />
              </div>

              {card.charges.length === 0 ? (
                <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  Esta tarjeta no tiene gastos todavía.
                </p>
              ) : (
                <div className="space-y-2">
                  {card.charges.map((charge) => (
                    <div
                      key={charge.id}
                      className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium">
                            {charge.description}
                          </p>
                          <Badge variant="secondary">
                            {getChargeBadgeLabel(charge)}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <p className="whitespace-nowrap font-semibold">
                          {formatCurrency(Number(charge.amount))}
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
          ))}
        </div>
      )}
    </div>
  );
}
