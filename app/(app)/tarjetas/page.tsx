import { CardsDashboard } from "@/components/cards-dashboard";
import { fetchAllCardsWithCharges } from "@/lib/cards/actions";
import { getCurrentYearMonth, isValidYearMonth } from "@/lib/format/month";

export default async function TarjetasPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const yearMonth =
    params.month && isValidYearMonth(params.month)
      ? params.month
      : getCurrentYearMonth();

  const data = await fetchAllCardsWithCharges();

  return <CardsDashboard initialData={data} initialYearMonth={yearMonth} />;
}
