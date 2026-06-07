"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  formatYearMonthLabel,
  shiftYearMonth,
} from "@/lib/format/month";
import { cn } from "@/lib/utils";

interface MonthPickerProps {
  yearMonth: string;
  onMonthChange: (yearMonth: string) => void;
}

export function MonthPicker({ yearMonth, onMonthChange }: MonthPickerProps) {
  const previousMonth = shiftYearMonth(yearMonth, -1);
  const nextMonth = shiftYearMonth(yearMonth, 1);

  return (
    <div className="flex items-center justify-between gap-4">
      <button
        type="button"
        aria-label="Mes anterior"
        onClick={() => onMonthChange(previousMonth)}
        className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="text-center">
        <h2 className="text-xl font-semibold">{formatYearMonthLabel(yearMonth)}</h2>
        <p className="text-sm text-muted-foreground">Resumen del mes</p>
      </div>

      <button
        type="button"
        aria-label="Mes siguiente"
        onClick={() => onMonthChange(nextMonth)}
        className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
