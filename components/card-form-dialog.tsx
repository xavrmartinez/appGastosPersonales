"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useSWRConfig } from "swr";
import { createCard, deleteCard, updateCard } from "@/lib/cards/actions";
import { allCardsKey } from "@/lib/cards/swr";
import type { CreditCard } from "@/types/database";
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

interface CardFormDialogProps {
  card?: CreditCard;
  variant?: "add" | "edit";
}

export function CardFormDialog({ card, variant = "add" }: CardFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(card?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { mutate } = useSWRConfig();

  const isEditing = Boolean(card);

  function resetForm() {
    setName(card?.name ?? "");
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  }

  async function invalidateCaches() {
    await mutate(allCardsKey());
    await mutate(
      (key) => Array.isArray(key) && key[0] === "month-summary",
      undefined,
      { revalidate: true },
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("El nombre es obligatorio.");
      return;
    }

    startTransition(async () => {
      try {
        if (isEditing && card) {
          await updateCard({ id: card.id, name: trimmedName });
        } else {
          await createCard({ name: trimmedName });
        }

        await invalidateCaches();
        setOpen(false);
        resetForm();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "No se pudo guardar la tarjeta.",
        );
      }
    });
  }

  function handleDelete() {
    if (!card) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteCard(card.id);
        await invalidateCaches();
        setOpen(false);
        resetForm();
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "No se pudo eliminar la tarjeta.",
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          variant === "edit" ? (
            <Button variant="ghost" size="icon" aria-label="Editar tarjeta" />
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
            Agregar tarjeta
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar" : "Agregar"} tarjeta</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modificá el nombre de la tarjeta."
              : "Creá una tarjeta para agrupar sus gastos."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="card-name">Nombre</Label>
            <Input
              id="card-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Visa Galicia"
            />
          </div>

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
