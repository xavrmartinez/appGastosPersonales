"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  chargeAppliesToMonth,
  toCardChargeMonthEntry,
} from "@/lib/cards/utils";
import { createClient } from "@/lib/supabase/server";
import type {
  AllCardsPayload,
  CardCharge,
  CardChargeMonthEntry,
  CardPaidFlag,
  CardWithCharges,
  CreateCardChargeInput,
  CreateCardInput,
  CreditCard,
  UpdateCardChargeInput,
  UpdateCardInput,
} from "@/types/database";

async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return { supabase, userId: user.id };
}

async function getNextCardSortOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("credit_cards")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ? Number(data[0].sort_order) + 1 : 0;
}

async function getNextChargeSortOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  cardId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("card_charges")
    .select("sort_order")
    .eq("user_id", userId)
    .eq("card_id", cardId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ? Number(data[0].sort_order) + 1 : 0;
}

function validateInstallmentCount(count: number) {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("La cantidad de pagos debe ser un número entero mayor a 0.");
  }
}

function normalizeChargeInput(input: {
  chargeType: CreateCardChargeInput["chargeType"];
  payYearMonth: string | null;
  installmentCount: number;
}) {
  if (input.chargeType === "fixed") {
    return {
      pay_year_month: null,
      installment_count: 1,
    };
  }

  validateInstallmentCount(input.installmentCount);

  return {
    pay_year_month: input.payYearMonth,
    installment_count: input.installmentCount,
  };
}

export async function fetchCardChargesForMonth(
  yearMonth: string,
): Promise<CardChargeMonthEntry[]> {
  const { supabase, userId } = await getAuthenticatedUserId();

  const { data: cards, error: cardsError } = await supabase
    .from("credit_cards")
    .select("id, name")
    .eq("user_id", userId);

  if (cardsError) {
    throw new Error(cardsError.message);
  }

  if (!cards?.length) {
    return [];
  }

  const cardNameById = new Map(cards.map((card) => [card.id, card.name]));

  const { data: charges, error: chargesError } = await supabase
    .from("card_charges")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (chargesError) {
    throw new Error(chargesError.message);
  }

  const { data: paidRows, error: paidError } = await supabase
    .from("monthly_paid_status")
    .select("item_id")
    .eq("user_id", userId)
    .eq("item_type", "card")
    .eq("year_month", yearMonth)
    .eq("is_paid", true);

  if (paidError) {
    throw new Error(paidError.message);
  }

  const paidCardIds = new Set(
    (paidRows ?? []).map((row) => row.item_id as string),
  );

  return ((charges ?? []) as CardCharge[])
    .filter((charge) => chargeAppliesToMonth(charge, yearMonth))
    .map((charge) =>
      toCardChargeMonthEntry(
        charge,
        cardNameById.get(charge.card_id) ?? "Tarjeta",
        yearMonth,
        paidCardIds.has(charge.card_id),
      ),
    );
}

export async function fetchAllCardsWithCharges(): Promise<AllCardsPayload> {
  const { supabase, userId } = await getAuthenticatedUserId();

  const { data: cards, error: cardsError } = await supabase
    .from("credit_cards")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (cardsError) {
    throw new Error(cardsError.message);
  }

  if (!cards?.length) {
    return { cards: [], paidFlags: [] };
  }

  const { data: charges, error: chargesError } = await supabase
    .from("card_charges")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (chargesError) {
    throw new Error(chargesError.message);
  }

  const { data: paidRows, error: paidError } = await supabase
    .from("monthly_paid_status")
    .select("item_id, year_month")
    .eq("user_id", userId)
    .eq("item_type", "card")
    .eq("is_paid", true);

  if (paidError) {
    throw new Error(paidError.message);
  }

  const chargesByCard = new Map<string, CardCharge[]>();
  for (const charge of (charges ?? []) as CardCharge[]) {
    const existing = chargesByCard.get(charge.card_id) ?? [];
    existing.push(charge);
    chargesByCard.set(charge.card_id, existing);
  }

  const cardsWithCharges: CardWithCharges[] = (cards as CreditCard[]).map(
    (card) => ({
      ...card,
      charges: chargesByCard.get(card.id) ?? [],
    }),
  );

  const paidFlags: CardPaidFlag[] = (paidRows ?? []).map((row) => ({
    cardId: row.item_id as string,
    yearMonth: row.year_month as string,
  }));

  return { cards: cardsWithCharges, paidFlags };
}

export async function setCardMonthPaid(
  cardId: string,
  yearMonth: string,
  isPaid: boolean,
) {
  const { supabase, userId } = await getAuthenticatedUserId();

  const { error } = await supabase.from("monthly_paid_status").upsert(
    {
      user_id: userId,
      item_type: "card",
      item_id: cardId,
      year_month: yearMonth,
      is_paid: isPaid,
    },
    { onConflict: "user_id,item_type,item_id,year_month" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/tarjetas");
}

export async function createCard(input: CreateCardInput) {
  const { supabase, userId } = await getAuthenticatedUserId();
  const sortOrder = await getNextCardSortOrder(supabase, userId);

  const { error } = await supabase.from("credit_cards").insert({
    user_id: userId,
    name: input.name.trim(),
    sort_order: sortOrder,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/tarjetas");
}

export async function updateCard(input: UpdateCardInput) {
  const { supabase, userId } = await getAuthenticatedUserId();

  const { error } = await supabase
    .from("credit_cards")
    .update({ name: input.name.trim() })
    .eq("id", input.id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/tarjetas");
}

export async function deleteCard(id: string) {
  const { supabase, userId } = await getAuthenticatedUserId();

  const { error } = await supabase
    .from("credit_cards")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/tarjetas");
}

export async function createCardCharge(input: CreateCardChargeInput) {
  const { supabase, userId } = await getAuthenticatedUserId();
  const normalized = normalizeChargeInput(input);
  const sortOrder = await getNextChargeSortOrder(
    supabase,
    userId,
    input.cardId,
  );

  const { error } = await supabase.from("card_charges").insert({
    user_id: userId,
    card_id: input.cardId,
    description: input.description.trim(),
    amount: input.amount,
    charge_type: input.chargeType,
    pay_year_month: normalized.pay_year_month,
    installment_count: normalized.installment_count,
    charge_date: input.chargeDate,
    sort_order: sortOrder,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/tarjetas");
}

export async function updateCardCharge(input: UpdateCardChargeInput) {
  const { supabase, userId } = await getAuthenticatedUserId();
  const normalized = normalizeChargeInput(input);

  const { error } = await supabase
    .from("card_charges")
    .update({
      card_id: input.cardId,
      description: input.description.trim(),
      amount: input.amount,
      charge_type: input.chargeType,
      pay_year_month: normalized.pay_year_month,
      installment_count: normalized.installment_count,
      charge_date: input.chargeDate,
    })
    .eq("id", input.id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/tarjetas");
}

export async function deleteCardCharge(id: string) {
  const { supabase, userId } = await getAuthenticatedUserId();

  const { error } = await supabase
    .from("card_charges")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/tarjetas");
}
