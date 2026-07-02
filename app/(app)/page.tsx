import { Suspense } from "react";
import { ResumenDashboard } from "@/components/resumen-dashboard";
import { ResumenSkeleton } from "@/components/resumen-skeleton";
import { ensureMonthAndFetchItems } from "@/lib/monthly/actions";
import { getCurrentYearMonth } from "@/lib/format/month";

export default async function ResumenPage() {
  const yearMonth = getCurrentYearMonth();

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
