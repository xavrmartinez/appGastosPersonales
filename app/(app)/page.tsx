import { Suspense } from "react";
import { ResumenDashboard } from "@/components/resumen-dashboard";
import { ResumenSkeleton } from "@/components/resumen-skeleton";
import { ensureMonthAndFetchItems } from "@/lib/monthly/actions";
import {
  getCurrentYearMonth,
  isValidYearMonth,
} from "@/lib/format/month";

export default async function ResumenPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const yearMonth =
    params.month && isValidYearMonth(params.month)
      ? params.month
      : getCurrentYearMonth();

  const summary = await ensureMonthAndFetchItems(yearMonth);

  return (
    <Suspense fallback={<ResumenSkeleton />}>
      <ResumenDashboard
        key={yearMonth}
        initialYearMonth={yearMonth}
        initialSummary={summary}
      />
    </Suspense>
  );
}
