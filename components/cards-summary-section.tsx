import Link from "next/link";
import { formatCurrency } from "@/lib/format/currency";
import type { CardChargeMonthEntry } from "@/types/database";
import { Badge } from "@/components/ui/badge";

interface CardsSummarySectionProps {
  cards: CardChargeMonthEntry[];
  totalCards: number;
}

export function CardsSummarySection({
  cards,
  totalCards,
}: CardsSummarySectionProps) {
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
            className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <p className="truncate font-medium">
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
