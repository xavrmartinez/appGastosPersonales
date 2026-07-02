"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useSWRConfig } from "swr";
import { setCardChargeMonthPaid } from "@/lib/cards/actions";
import { allCardsKey } from "@/lib/cards/swr";
import { formatCurrency } from "@/lib/format/currency";
import { monthSummaryKey } from "@/lib/monthly/swr";
import { cn } from "@/lib/utils";
import type { CardChargeMonthEntry } from "@/types/database";
import { Badge } from "@/components/ui/badge";

interface CardsSummarySectionProps {
  yearMonth: string;
  cards: CardChargeMonthEntry[];
  totalCards: number;
}

export function CardsSummarySection({
  yearMonth,
  cards,
  totalCards,
}: CardsSummarySectionProps) {
  const { mutate } = useSWRConfig();
  const [, startTransition] = useTransition();

  function handleTogglePaid(chargeId: string, nextPaid: boolean) {
    startTransition(async () => {
      await setCardChargeMonthPaid(chargeId, yearMonth, nextPaid);
      await mutate(monthSummaryKey(yearMonth));
      await mutate(allCardsKey());
    });
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Tarjetas</h3>
        <p className="text-sm text-muted-foreground">
          Gastos de tarjetas para este mes. Para editarlos, andá a la solapa{" "}
          <Link href="/tarjetas" className="font-medium text-primary underline">
            Tarjetas
          </Link>
          .
        </p>
      </div>

      <div className="space-y-2">
        {cards.map((card) => (
          <div
            key={card.id}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3",
              card.isPaid && "opacity-60",
            )}
          >
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0 cursor-pointer"
              checked={card.isPaid}
              onChange={(event) =>
                handleTogglePaid(card.id, event.target.checked)
              }
              aria-label="Marcar como pagado"
              title="Marcar como pagado"
            />
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <p
                className={cn(
                  "truncate font-medium",
                  card.isPaid && "line-through",
                )}
              >
                <span className="text-muted-foreground">{card.cardName}</span>
                {" · "}
                {card.description}
              </p>
              {card.chargeType === "installment" &&
                card.installmentCount &&
                card.installmentCount > 1 &&
                card.installmentIndex && (
                  <Badge variant="secondary">
                    Cuota {card.installmentIndex}/{card.installmentCount}
                  </Badge>
                )}
              {card.chargeType === "fixed" && (
                <Badge variant="outline">Fijo</Badge>
              )}
            </div>
            <p className="whitespace-nowrap font-semibold text-violet-600">
              {formatCurrency(card.monthAmount)}
            </p>
          </div>
        ))}

        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
          <p className="font-medium">Total tarjetas del mes</p>
          <p className="font-semibold text-violet-600">
            {formatCurrency(totalCards)}
          </p>
        </div>
      </div>
    </section>
  );
}
