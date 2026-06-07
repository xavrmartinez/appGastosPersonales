import { DebtsDashboard } from "@/components/debts-dashboard";
import { fetchAllDebts } from "@/lib/debts/actions";

export default async function DeudasPage() {
  const debts = await fetchAllDebts();

  return <DebtsDashboard initialDebts={debts} />;
}
