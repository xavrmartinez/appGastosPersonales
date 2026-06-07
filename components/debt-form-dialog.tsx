"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useSWRConfig } from "swr";
import { createDebt, deleteDebt, updateDebt } from "@/lib/debts/actions";
import { allDebtsKey } from "@/lib/debts/swr";
import {
  getAffectedYearMonths,
  getInstallmentAmount,
} from "@/lib/debts/utils";
import { formatCurrency, parseAmount } from "@/lib/format/currency";
import {
  formatYearMonthLabel,
  shiftYearMonth,
} from "@/lib/format/month";
import { monthSummaryKey } from "@/lib/monthly/swr";
import type { Debt } from "@/types/database";
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

interface DebtFormDialogProps {
  debt?: Debt;
  variant?: "add" | "edit";
  defaultPayYearMonth?: string;
}

function buildPreviewMonths(payYearMonth: string, installmentCount: number) {
  return Array.from({ length: installmentCount }, (_, index) =>
    formatYearMonthLabel(shiftYearMonth(payYearMonth, index)),
  );
}

export function DebtFormDialog({
  debt,
  variant = "add",
  defaultPayYearMonth,
}: DebtFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(debt?.description ?? "");
  const [amount, setAmount] = useState(debt ? String(debt.amount) : "");
  const [payYearMonth, setPayYearMonth] = useState(
    debt?.pay_year_month ?? defaultPayYearMonth ?? "",
  );
  const [noMonth, setNoMonth] = useState(debt ? !debt.pay_year_month : false);
  const [installmentCount, setInstallmentCount] = useState(
    debt?.installment_count ?? 1,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { mutate } = useSWRConfig();

  const isEditing = Boolean(debt);

  const preview = useMemo(() => {
    const parsedAmount = parseAmount(amount);
    if (!payYearMonth || noMonth || parsedAmount === null || installmentCount < 1) {
      return null;
    }

    const previewDebt: Debt = {
      id: debt?.id ?? "preview",
      user_id: debt?.user_id ?? "",
      description: description.trim() || "Deuda",
      amount: parsedAmount,
      pay_year_month: payYearMonth,
      installment_count: installmentCount,
      sort_order: debt?.sort_order ?? 0,
      created_at: debt?.created_at ?? "",
    };

    const installmentAmount = getInstallmentAmount(previewDebt);
    const months = buildPreviewMonths(payYearMonth, installmentCount);

    return {
      installmentAmount,
      months,
    };
  }, [amount, debt, description, installmentCount, noMonth, payYearMonth]);

  function resetForm() {
    setDescription(debt?.description ?? "");
    setAmount(debt ? String(debt.amount) : "");
    setPayYearMonth(debt?.pay_year_month ?? defaultPayYearMonth ?? "");
    setNoMonth(debt ? !debt.pay_year_month : false);
    setInstallmentCount(debt?.installment_count ?? 1);
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
    } else if (!payYearMonth && defaultPayYearMonth) {
      setPayYearMonth(defaultPayYearMonth);
    }
  }

  async function invalidateCaches(previousDebt?: Debt, nextDebt?: Debt) {
    await mutate(allDebtsKey());

    const monthsToInvalidate = new Set<string>();
    if (previousDebt) {
      for (const month of getAffectedYearMonths(previousDebt)) {
        monthsToInvalidate.add(month);
      }
    }
    if (nextDebt) {
      for (const month of getAffectedYearMonths(nextDebt)) {
        monthsToInvalidate.add(month);
      }
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
    const resolvedPayYearMonth = noMonth ? null : payYearMonth || null;
    const parsedInstallmentCount = noMonth ? 1 : Number(installmentCount);

    if (!trimmedDescription) {
      setError("La descripción es obligatoria.");
      return;
    }

    if (parsedAmount === null) {
      setError("Ingresá un monto válido mayor a 0.");
      return;
    }

    if (
      !noMonth &&
      (!Number.isInteger(parsedInstallmentCount) || parsedInstallmentCount < 1)
    ) {
      setError("La cantidad de pagos debe ser un número entero mayor a 0.");
      return;
    }

    startTransition(async () => {
      try {
        if (isEditing && debt) {
          await updateDebt({
            id: debt.id,
            description: trimmedDescription,
            amount: parsedAmount,
            payYearMonth: resolvedPayYearMonth,
            installmentCount: parsedInstallmentCount,
          });

          await invalidateCaches(debt, {
            ...debt,
            amount: parsedAmount,
            pay_year_month: resolvedPayYearMonth,
            installment_count: parsedInstallmentCount,
          });
        } else {
          await createDebt({
            description: trimmedDescription,
            amount: parsedAmount,
            payYearMonth: resolvedPayYearMonth,
            installmentCount: parsedInstallmentCount,
          });

          if (resolvedPayYearMonth) {
            await invalidateCaches(undefined, {
              id: "new",
              user_id: "",
              description: trimmedDescription,
              amount: parsedAmount,
              pay_year_month: resolvedPayYearMonth,
              installment_count: parsedInstallmentCount,
              sort_order: 0,
              created_at: "",
            });
          } else {
            await mutate(allDebtsKey());
          }
        }

        setOpen(false);
        resetForm();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "No se pudo guardar la deuda.",
        );
      }
    });
  }

  function handleDelete() {
    if (!debt) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteDebt(debt.id);
        await invalidateCaches(debt);
        setOpen(false);
        resetForm();
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "No se pudo eliminar la deuda.",
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          variant === "edit" ? (
            <Button variant="ghost" size="icon" aria-label="Editar" />
          ) : (
            <Button size="sm" />
          )
        }
      >
        {variant === "edit" ? (
          <Pencil className="h-4 w-4" />
        ) : (
          <>
            <Plus className="h-4 w-4" />
            Agregar
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar" : "Agregar"} deuda</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Elegí el mes de inicio y definí las cuotas si corresponde."
              : "Registrá una deuda. Podés dejarla sin mes y asignarlo después."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="debt-description">Descripción</Label>
            <Input
              id="debt-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Tarjeta Visa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="debt-amount">Monto total (ARS)</Label>
            <Input
              id="debt-amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="300000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="debt-pay-month">Mes del primer pago</Label>
            <Input
              id="debt-pay-month"
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
              <Label htmlFor="debt-installments">Cantidad de pagos</Label>
              <Input
                id="debt-installments"
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

          {noMonth ? (
            <p className="text-sm text-muted-foreground">
              La deuda quedará guardada sin fecha. Podés asignar el mes cuando
              quieras.
            </p>
          ) : preview ? (
            <p className="text-sm text-muted-foreground">
              Se verá en {preview.months.join(", ")} con{" "}
              {formatCurrency(preview.installmentAmount)} por mes.
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
