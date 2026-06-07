"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useSWRConfig } from "swr";
import { ItemsSection } from "@/components/items-section";
import { formatCurrency } from "@/lib/format/currency";
import { persistItemsLayout } from "@/lib/monthly/actions";
import { monthSummaryKey } from "@/lib/monthly/swr";
import type { ItemType, MonthlyItem } from "@/types/database";

const INCOME_CONTAINER = "income";
const EXPENSE_CONTAINER = "expense";

interface ItemsDndBoardProps {
  yearMonth: string;
  incomes: MonthlyItem[];
  expenses: MonthlyItem[];
}

function findContainer(
  id: UniqueIdentifier,
  incomes: MonthlyItem[],
  expenses: MonthlyItem[],
): ItemType | null {
  if (id === INCOME_CONTAINER) {
    return "income";
  }
  if (id === EXPENSE_CONTAINER) {
    return "expense";
  }
  if (incomes.some((item) => item.id === id)) {
    return "income";
  }
  if (expenses.some((item) => item.id === id)) {
    return "expense";
  }
  return null;
}

export function ItemsDndBoard({
  yearMonth,
  incomes: initialIncomes,
  expenses: initialExpenses,
}: ItemsDndBoardProps) {
  const [incomes, setIncomes] = useState(initialIncomes);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overContainer, setOverContainer] = useState<ItemType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    setIncomes(initialIncomes);
    setExpenses(initialExpenses);
  }, [initialIncomes, initialExpenses]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeItem = [...incomes, ...expenses].find(
    (item) => item.id === activeId,
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
    setError(null);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) {
        setOverContainer(null);
        return;
      }

      const activeContainer = findContainer(active.id, incomes, expenses);
      const overContainerId = findContainer(over.id, incomes, expenses);

      setOverContainer(overContainerId);

      if (!activeContainer || !overContainerId) {
        return;
      }

      if (activeContainer === overContainerId) {
        const items = activeContainer === "income" ? incomes : expenses;
        const setItems = activeContainer === "income" ? setIncomes : setExpenses;
        const activeIndex = items.findIndex((item) => item.id === active.id);
        const overIndex = items.findIndex((item) => item.id === over.id);

        if (
          activeIndex !== -1 &&
          overIndex !== -1 &&
          activeIndex !== overIndex
        ) {
          setItems(arrayMove(items, activeIndex, overIndex));
        }
        return;
      }

      const sourceItems = activeContainer === "income" ? incomes : expenses;
      const destItems = overContainerId === "income" ? incomes : expenses;
      const setSource =
        activeContainer === "income" ? setIncomes : setExpenses;
      const setDest = overContainerId === "income" ? setIncomes : setExpenses;

      const activeIndex = sourceItems.findIndex((item) => item.id === active.id);
      if (activeIndex === -1) {
        return;
      }

      const movedItem = {
        ...sourceItems[activeIndex],
        type: overContainerId,
      };

      let overIndex = destItems.findIndex((item) => item.id === over.id);
      if (overIndex === -1) {
        overIndex = destItems.length;
      }

      const newSource = [...sourceItems];
      newSource.splice(activeIndex, 1);

      const newDest = [...destItems];
      newDest.splice(overIndex, 0, movedItem);

      setSource(newSource);
      setDest(newDest);
    },
    [incomes, expenses],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { over } = event;
      setActiveId(null);
      setOverContainer(null);

      if (!over) {
        setIncomes(initialIncomes);
        setExpenses(initialExpenses);
        return;
      }

      const incomeIds = incomes.map((item) => item.id);
      const expenseIds = expenses.map((item) => item.id);
      const originalIncomeIds = initialIncomes.map((item) => item.id);
      const originalExpenseIds = initialExpenses.map((item) => item.id);

      const layoutChanged =
        incomeIds.join(",") !== originalIncomeIds.join(",") ||
        expenseIds.join(",") !== originalExpenseIds.join(",");

      if (!layoutChanged) {
        return;
      }

      const snapshotIncomes = initialIncomes;
      const snapshotExpenses = initialExpenses;

      startTransition(async () => {
        try {
          await persistItemsLayout({
            yearMonth,
            incomeIds,
            expenseIds,
          });
          await mutate(monthSummaryKey(yearMonth));
        } catch (persistError) {
          setIncomes(snapshotIncomes);
          setExpenses(snapshotExpenses);
          setError(
            persistError instanceof Error
              ? persistError.message
              : "No se pudo guardar el orden.",
          );
        }
      });
    },
    [
      incomes,
      expenses,
      initialIncomes,
      initialExpenses,
      mutate,
      yearMonth,
    ],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverContainer(null);
    setIncomes(initialIncomes);
    setExpenses(initialExpenses);
  }, [initialIncomes, initialExpenses]);

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="space-y-8" aria-busy={isPending}>
          <ItemsSection
            yearMonth={yearMonth}
            type="income"
            items={incomes}
            containerId={INCOME_CONTAINER}
            isOver={overContainer === "income" && activeId !== null}
          />
          <ItemsSection
            yearMonth={yearMonth}
            type="expense"
            items={expenses}
            containerId={EXPENSE_CONTAINER}
            isOver={overContainer === "expense" && activeId !== null}
          />
        </div>

        <DragOverlay>
          {activeItem ? (
            <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg">
              <p className="font-medium">{activeItem.description}</p>
              <p className="font-semibold">
                {formatCurrency(Number(activeItem.amount))}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
