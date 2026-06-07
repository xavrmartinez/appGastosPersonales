import { CardsDashboard } from "@/components/cards-dashboard";
import { fetchAllCardsWithCharges } from "@/lib/cards/actions";

export default async function TarjetasPage() {
  const cards = await fetchAllCardsWithCharges();

  return <CardsDashboard initialCards={cards} />;
}
