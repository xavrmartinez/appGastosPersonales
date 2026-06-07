import type { CardWithCharges } from "@/types/database";

export function allCardsKey() {
  return ["all-cards"] as const;
}

export function emptyCardsList(): CardWithCharges[] {
  return [];
}
