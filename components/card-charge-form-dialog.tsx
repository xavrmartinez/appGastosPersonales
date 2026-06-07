"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useSWRConfig } from "swr";
import {
  createCardCharge,
  deleteCardCharge,
  updateCardCharge,
} from "@/lib/cards/actions";
import { allCardsKey } from "@/lib/cards/swr";
import { getAffectedYearMonths, getMonthAmount } from "@/lib/cards/utils";
import { formatCurrency, parseAmount } from "@/lib/format/currency";
import {
  formatYearMonthLabel,
  getCurrentYearMonth,
  shiftYearMonth,
} from "@/lib/format/month";
import { monthSummaryKey } from "@/lib/monthly/swr";
import type { CardCharge, CardChargeType } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CardChargeFormDialogProps {
  cardId: string;
  charge?: CardCharge;
  variant?: "add" | "edit";
}

function buildPreviewMonths(payYearMonth: string, installmentCount: number) {
  return Array.from({ length: installmentCount }, (_, index) =>
    formatYearMonthLabel(shiftYearMonth(payYearMonth, index)),
  );
}

export function CardChargeFormDialog({
  cardId,
  charge,
  variant = "add",
}: CardChargeFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(charge?.description ?? "");
  const [amount, setAmount] = useState(charge ? String(charge.amount) : "");
  const [chargeType, setChargeType] = useState<CardChargeType>(
    charge?.charge_type ?? "fixed",
  );
  const [payYearMonth, setPayYearMonth] = useState(
    charge?.pay_year_month ?? getCurrentYearMonth(),
  );
  const [noMonth, setNoMonth] = useState(
    charge ? charge.charge_type === "installment" && !charge.pay_year_month : false,
  );
  const [installmentCount, setInstallmentCount] = useState(
    charge?.installment_count ?? 1,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { mutate } = useSWRConfig();

  const isEditing = Boolean(charge);

  const preview = useMemo(() => {
    const parsedAmount = parseAmount(amount);
    if (
      chargeType !== "installment" ||
      noMonth ||
      !payYearMonth ||
      parsedAmount === null ||
      installmentCount < 1
    ) {
      return null;
    }

    const previewCharge: CardCharge = {
      id: charge?.id ?? "preview",
      card_id: cardId,
      user_id: charge?.user_id ?? "",
      description: description.trim() || "Gasto",
      amount: parsedAmount,
      charge_type: "installment",
      pay_year_month: payYearMonth,
      installment_count: installmentCount,
      sort_order: charge?.sort_order ?? 0,
      created_at: charge?.created_at ?? "",
    };

    return {
      monthAmount: getMonthAmount(previewCharge),
      months: buildPreviewMonths(payYearMonth, installmentCount),
    };
  }, [
    amount,
    cardId,
    charge,
    chargeType,
    description,
    installmentCount,
    noMonth,
    payYearMonth,
  ]);

  function resetForm() {
    setDescription(charge?.description ?? "");
    setAmount(charge ? String(charge.amount) : "");
    setChargeType(charge?.charge_type ?? "fixed");
    setPayYearMonth(charge?.pay_year_month ?? getCurrentYearMonth());
    setNoMonth(
      charge ? charge.charge_type === "installment" && !charge.pay_year_month : false,
    );
    setInstallmentCount(charge?.installment_count ?? 1);
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  }

  function handleNoMonthChange(checked: boolean) {
    setNoMonth(checked);
    if (checked) {
      setPayYearMonth("");
    } else if (!payYearMonth) {
      setPayYearMonth(getCurrentYearMonth());
    }
  }

  async function invalidateCaches(
    previousCharge?: CardCharge,
    nextCharge?: CardCharge,
  ) {
    await mutate(allCardsKey());

    const monthsToInvalidate = new Set<string>();
    if (previousCharge) {
      for (const month of getAffectedYearMonths(previousCharge)) {
        monthsToInvalidate.add(month);
      }
    }
    if (nextCharge) {
      for (const month of getAffectedYearMonths(nextCharge)) {
        monthsToInvalidate.add(month);
      }
    }

    if (previousCharge?.charge_type === "fixed" || nextCharge?.charge_type === "fixed") {
      await mutate(
        (key) => Array.isArray(key) && key[0] === "month-summary",
        undefined,
        { revalidate: true },
      );
      return;
    }

    await Promise.all(
      [...monthsToInvalidate].map((month) => mutate(monthSummaryKey(month))),
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedAmount = parseAmount(amount);
    const trimmedDescription = description.trim();
    const resolvedPayYearMonth =
      chargeType === "installment" && !noMonth ? payYearMonth || null : null;
    const parsedInstallmentCount =
      chargeType === "installment" && !noMonth ? Number(installmentCount) : 1;

    if (!trimmedDescription) {
      setError("La descripción es obligatoria.");
      return;
    }

    if (parsedAmount === null) {
      setError("Ingresá un monto válido mayor a 0.");
      return;
    }

    if (
      chargeType === "installment" &&
      !noMonth &&
      (!Number.isInteger(parsedInstallmentCount) || parsedInstallmentCount < 1)
    ) {
      setError("La cantidad de pagos debe ser un número entero mayor a 0.");
      return;
    }

    const payload = {
      cardId,
      description: trimmedDescription,
      amount: parsedAmount,
      chargeType,
      payYearMonth: resolvedPayYearMonth,
      installmentCount: parsedInstallmentCount,
    };

    startTransition(async () => {
      try {
        if (isEditing && charge) {
          await updateCardCharge({ id: charge.id, ...payload });
          await invalidateCaches(charge, {
            ...charge,
            amount: parsedAmount,
            charge_type: chargeType,
            pay_year_month: resolvedPayYearMonth,
            installment_count: parsedInstallmentCount,
          });
        } else {
          await createCardCharge(payload);
          await invalidateCaches(undefined, {
            id: "new",
            card_id: cardId,
            user_id: "",
            description: trimmedDescription,
            amount: parsedAmount,
            charge_type: chargeType,
            pay_year_month: resolvedPayYearMonth,
            installment_count: parsedInstallmentCount,
            sort_order: 0,
            created_at: "",
          });
        }

        setOpen(false);
        resetForm();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "No se pudo guardar el gasto.",
        );
      }
    });
  }

  function handleDelete() {
    if (!charge) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteCardCharge(charge.id);
        await invalidateCaches(charge);
        setOpen(false);
        resetForm();
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "No se pudo eliminar el gasto.",
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          variant === "edit" ? (
            <Button variant="ghost" size="icon" aria-label="Editar gasto" />
          ) : (
            <Button size="sm" variant="outline" />
          )
        }
      >
        {variant === "edit" ? (
          <Pencil className="h-4 w-4" />
        ) : (
          <>
            <Plus className="h-4 w-4" />
            Agregar gasto
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar" : "Agregar"} gasto</DialogTitle>
          <DialogDescription>
            Definí si es un gasto fijo mensual o en cuotas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="charge-description">Descripción</Label>
            <Input
              id="charge-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Spotify"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Tabs
              value={chargeType}
              onValueChange={(value) => setChargeType(value as CardChargeType)}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fixed">Fijo</TabsTrigger>
                <TabsTrigger value="installment">Cuotas</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label htmlFor="charge-amount">
              {chargeType === "fixed" ? "Monto mensual (ARS)" : "Monto total (ARS)"}
            </Label>
            <Input
              id="charge-amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={chargeType === "fixed" ? "50000" : "300000"}
            />
          </div>

          {chargeType === "installment" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="charge-pay-month">Mes del primer pago</Label>
                <Input
                  id="charge-pay-month"
                  type="month"
                  value={payYearMonth}
                  disabled={noMonth}
                  onChange={(event) => setPayYearMonth(event.target.value)}
                />
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={noMonth}
                    onChange={(event) => handleNoMonthChange(event.target.checked)}
                  />
                  Sin mes por ahora
                </label>
              </div>

              {!noMonth && (
                <div className="space-y-2">
                  <Label htmlFor="charge-installments">Cantidad de pagos</Label>
                  <Input
                    id="charge-installments"
                    type="number"
                    min={1}
                    step={1}
                    value={installmentCount}
                    onChange={(event) =>
                      setInstallmentCount(
                        Math.max(1, Number(event.target.value) || 1),
                      )
                    }
                  />
                </div>
              )}
            </>
          )}

          {chargeType === "fixed" ? (
            <p className="text-sm text-muted-foreground">
              Este gasto aparecerá en el resumen de todos los meses.
            </p>
          ) : noMonth ? (
            <p className="text-sm text-muted-foreground">
              El gasto quedará guardado sin fecha. Podés asignar el mes cuando
              quieras.
            </p>
          ) : preview ? (
            <p className="text-sm text-muted-foreground">
              Se verá en {preview.months.join(", ")} con{" "}
              {formatCurrency(preview.monthAmount)} por mes.
            </p>
          ) : null}

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            {isEditing ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
