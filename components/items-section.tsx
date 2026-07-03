"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useSWRConfig } from "swr";
import {
  createItem,
  deleteItem,
  setItemPaid,
  updateItem,
} from "@/lib/monthly/actions";
import { monthSummaryKey } from "@/lib/monthly/swr";
import { formatCurrency, parseAmount } from "@/lib/format/currency";
import { formatYearMonthLabel } from "@/lib/format/month";
import type { ItemType, MonthSummary, MonthlyItem } from "@/types/database";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

interface ItemFormDialogProps {
  yearMonth: string;
  type: ItemType;
  item?: MonthlyItem;
  variant?: "add" | "edit";
}

export function ItemFormDialog({
  yearMonth,
  type,
  item,
  variant = "add",
}: ItemFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"recurring" | "one_off">(
    item?.source === "one_off" ? "one_off" : "recurring",
  );
  const [description, setDescription] = useState(item?.description ?? "");
  const [amount, setAmount] = useState(item ? String(item.amount) : "");
  const [updateTemplate, setUpdateTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { mutate } = useSWRConfig();

  const isEditing = Boolean(item);
  const typeLabel = type === "income" ? "ingreso" : "gasto";
  const monthLabel = formatYearMonthLabel(yearMonth);

  function resetForm() {
    setDescription(item?.description ?? "");
    setAmount(item ? String(item.amount) : "");
    setMode(item?.source === "one_off" ? "one_off" : "recurring");
    setUpdateTemplate(false);
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedAmount = parseAmount(amount);
    const trimmedDescription = description.trim();

    if (!trimmedDescription) {
      setError("La descripción es obligatoria.");
      return;
    }

    if (parsedAmount === null) {
      setError("Ingresá un monto válido mayor a 0.");
      return;
    }

    startTransition(async () => {
      try {
        if (isEditing && item) {
          await updateItem({
            id: item.id,
            description: trimmedDescription,
            amount: parsedAmount,
            updateTemplate: updateTemplate && item.source === "recurring",
          });
        } else {
          await createItem({
            yearMonth,
            type,
            description: trimmedDescription,
            amount: parsedAmount,
            isRecurring: mode === "recurring",
          });
        }

        await mutate(monthSummaryKey(yearMonth));
        setOpen(false);
        resetForm();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "No se pudo guardar el item.",
        );
      }
    });
  }

  function handleDelete() {
    if (!item) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteItem(item.id);
        await mutate(monthSummaryKey(yearMonth));
        if (item.source === "recurring") {
          void mutate(
            (key) =>
              Array.isArray(key) &&
              key[0] === "month-summary" &&
              typeof key[1] === "string" &&
              key[1] > yearMonth,
          );
        }
        setOpen(false);
        resetForm();
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "No se pudo eliminar el item.",
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
          <DialogTitle>
            {isEditing ? "Editar" : "Agregar"} {typeLabel}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Modificá este ${typeLabel} para ${monthLabel}.`
              : `Creá un ${typeLabel} para ${monthLabel}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing && (
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Tabs
                value={mode}
                onValueChange={(value) =>
                  setMode(value as "recurring" | "one_off")
                }
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="recurring">Fijo</TabsTrigger>
                  <TabsTrigger value="one_off">Solo este mes</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={type === "income" ? "Sueldo" : "Alquiler"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Monto (ARS)</Label>
            <Input
              id="amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="500000"
            />
          </div>

          {isEditing && item?.source === "recurring" && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={updateTemplate}
                onChange={(event) => setUpdateTemplate(event.target.checked)}
              />
              Actualizar plantilla (afecta meses futuros no modificados)
            </label>
          )}

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

interface ItemRowProps {
  yearMonth: string;
  type: ItemType;
  item: MonthlyItem;
  monthLabel: string;
}

export function ItemRow({ yearMonth, type, item, monthLabel }: ItemRowProps) {
  const { mutate } = useSWRConfig();

  function handleTogglePaid(nextPaid: boolean) {
    void mutate(
      monthSummaryKey(yearMonth),
      (current: MonthSummary | undefined) =>
        current
          ? {
              ...current,
              expenses: current.expenses.map((expense) =>
                expense.id === item.id
                  ? { ...expense, is_paid: nextPaid }
                  : expense,
              ),
            }
          : current,
      { revalidate: false },
    );
    void setItemPaid(item.id, nextPaid);
  }

  const isExpense = type === "expense";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3",
        isExpense && item.is_paid && "opacity-60",
      )}
    >
      {isExpense && (
        <input
          type="checkbox"
          className="h-4 w-4 shrink-0 cursor-pointer"
          checked={item.is_paid}
          onChange={(event) => handleTogglePaid(event.target.checked)}
          aria-label="Marcar como pagado"
          title="Marcar como pagado"
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "truncate font-medium",
              isExpense && item.is_paid && "line-through",
            )}
          >
            {item.description}
          </p>
          <Badge variant={item.source === "recurring" ? "default" : "secondary"}>
            {item.source === "recurring"
              ? "Fijo"
              : `Solo ${monthLabel.split(" ")[0]}`}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <p className="whitespace-nowrap font-semibold">
          {formatCurrency(Number(item.amount))}
        </p>
        <ItemFormDialog
          yearMonth={yearMonth}
          type={type}
          item={item}
          variant="edit"
        />
      </div>
    </div>
  );
}

interface ItemsSectionProps {
  yearMonth: string;
  type: ItemType;
  items: MonthlyItem[];
}

export function ItemsSection({ yearMonth, type, items }: ItemsSectionProps) {
  const title = type === "income" ? "Ingresos" : "Gastos";
  const monthLabel = formatYearMonthLabel(yearMonth);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <ItemFormDialog yearMonth={yearMonth} type={type} />
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Todavía no hay {type === "income" ? "ingresos" : "gastos"} en este mes.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              yearMonth={yearMonth}
              type={type}
              item={item}
              monthLabel={monthLabel}
            />
          ))}
        </div>
      )}
    </section>
  );
}
