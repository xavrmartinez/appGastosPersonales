import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format/currency";
import { cn } from "@/lib/utils";

interface BalanceSummaryProps {
  totalIncome: number;
  totalExpense: number;
  totalDebts: number;
  totalCards: number;
  balance: number;
  showDebts?: boolean;
  showCards?: boolean;
}

export function BalanceSummary({
  totalIncome,
  totalExpense,
  totalDebts,
  totalCards,
  balance,
  showDebts = false,
  showCards = false,
}: BalanceSummaryProps) {
  const extraColumns = (showDebts ? 1 : 0) + (showCards ? 1 : 0);
  const columnClass =
    extraColumns === 0
      ? "lg:grid-cols-3"
      : extraColumns === 1
        ? "lg:grid-cols-4"
        : "lg:grid-cols-5";

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", columnClass)}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Ingresos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold text-emerald-600">
            {formatCurrency(totalIncome)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Gastos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold text-red-600">
            {formatCurrency(totalExpense)}
          </p>
        </CardContent>
      </Card>

      {showDebts && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deudas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-orange-600">
              {formatCurrency(totalDebts)}
            </p>
          </CardContent>
        </Card>
      )}

      {showCards && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tarjetas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-violet-600">
              {formatCurrency(totalCards)}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              "text-2xl font-semibold",
              balance >= 0 ? "text-emerald-600" : "text-red-600",
            )}
          >
            {formatCurrency(balance)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
