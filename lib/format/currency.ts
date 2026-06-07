const formatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
  return formatter.format(amount);
}

export function parseAmount(value: string): number | null {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}
