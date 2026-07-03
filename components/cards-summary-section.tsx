"use client";

import Link from "next/link";
import { useSWRConfig } from "swr";
import { setCardMonthPaid } from "@/lib/cards/actions";
import { allCardsKey } from "@/lib/cards/swr";
import { formatCurrency } from "@/lib/format/currency";
import { monthSummaryKey } from "@/lib/monthly/swr";
import { cn } from "@/lib/utils";
import type {
  CardChargeMonthEntry,
  MonthSummary,
} from "@/types/database";
import { Badge } from "@/components/ui/badge";

interface CardsSummarySectionProps {
  yearMonth: string;
  cards: CardChargeMonthEntry[];
  totalCards: number;
}

interface CardGroup {
  cardId: string;
  cardName: string;
  entries: CardChargeMonthEntry[];
  subtotal: number;
  isPaid: boolean;
}

function groupByCard(cards: CardChargeMonthEntry[]): CardGroup[] {
  const groups = new Map<string, CardGroup>();
  for (const entry of cards) {
    const group = groups.get(entry.cardId);
    if (group) {
      group.entries.push(entry);
      group.subtotal += entry.monthAmount;
    } else {
      groups.set(entry.cardId, {
        cardId: entry.cardId,
        cardName: entry.cardName,
        entries: [entry],
        subtotal: entry.monthAmount,
        isPaid: entry.isPaid,
      });
    }
  }
  return [...groups.values()];
}

export function CardsSummarySection({
  yearMonth,
  cards,
  totalCards,
}: CardsSummarySectionProps) {
  const { mutate } = useSWRConfig();
  const groups = groupByCard(cards);

  function handleTogglePaid(cardId: string, nextPaid: boolean) {
    void mutate(
      monthSummaryKey(yearMonth),
      (current: MonthSummary | undefined) =>
        current
          ? {
              ...current,
              cards: current.cards.map((entry) =>
                entry.cardId === cardId
                  ? { ...entry, isPaid: nextPaid }
                  : entry,
              ),
            }
          : current,
      { revalidate: false },
    );
    void mutate(allCardsKey());
    void setCardMonthPaid(cardId, yearMonth, nextPaid);
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

      <div className="space-y-4">
        {groups.map((group) => (
          <div
            key={group.cardId}
            className={cn(
              "space-y-2 rounded-lg border bg-card p-3",
              group.isPaid && "opacity-60",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 cursor-pointer"
                  checked={group.isPaid}
                  onChange={(event) =>
                    handleTogglePaid(group.cardId, event.target.checked)
                  }
                  aria-label="Marcar tarjeta como pagada"
                  title="Marcar tarjeta como pagada"
                />
                <p
                  className={cn(
                    "font-semibold",
                    group.isPaid && "line-through",
                  )}
                >
                  {group.cardName}
                </p>
              </div>
              <p className="whitespace-nowrap font-semibold text-violet-600">
                {formatCurrency(group.subtotal)}
              </p>
            </div>

            <div className="space-y-1 pl-6">
              {group.entries.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <p className="truncate">{card.description}</p>
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
                  <p className="whitespace-nowrap text-muted-foreground">
                    {formatCurrency(card.monthAmount)}
                  </p>
                </div>
              ))}
            </div>
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
