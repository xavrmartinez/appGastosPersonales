"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ensureMonthItems,
  syncUnmodifiedItemsFromTemplate,
} from "@/lib/monthly/ensure-month";
import { createClient } from "@/lib/supabase/server";
import { fetchCardChargesForMonth } from "@/lib/cards/actions";
import { fetchDebtsForMonth } from "@/lib/debts/actions";
import type {
  CardChargeMonthEntry,
  CreateItemInput,
  DebtMonthEntry,
  ItemType,
  MonthSummary,
  MonthlyItem,
  PersistItemsLayoutInput,
  UpdateItemInput,
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

async function getNextSortOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  yearMonth: string,
  type: ItemType,
): Promise<number> {
  const { data, error } = await supabase
    .from("monthly_items")
    .select("sort_order")
    .eq("user_id", userId)
    .eq("year_month", yearMonth)
    .eq("type", type)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ? Number(data[0].sort_order) + 1 : 0;
}

function buildSummary(
  yearMonth: string,
  items: MonthlyItem[],
  debts: DebtMonthEntry[],
  cards: CardChargeMonthEntry[],
): MonthSummary {
  const byAmountDesc = (a: MonthlyItem, b: MonthlyItem) =>
    Number(b.amount) - Number(a.amount);
  const incomes = items
    .filter((item) => item.type === "income")
    .sort(byAmountDesc);
  const expenses = items
    .filter((item) => item.type === "expense")
    .sort(byAmountDesc);
  const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalDebts = debts.reduce(
    (sum, debt) => sum + (Number(debt.installmentAmount) || 0),
    0,
  );
  const totalCards = cards.reduce(
    (sum, card) => sum + (Number(card.monthAmount) || 0),
    0,
  );

  return {
    yearMonth,
    incomes,
    expenses,
    debts,
    cards,
    totalIncome,
    totalExpense,
    totalDebts,
    totalCards,
    balance: totalIncome - totalExpense - totalDebts - totalCards,
  };
}

export async function ensureMonthAndFetchItems(
  yearMonth: string,
): Promise<MonthSummary> {
  const { supabase, userId } = await getAuthenticatedUserId();

  await ensureMonthItems(supabase, userId, yearMonth);

  const { data, error } = await supabase
    .from("monthly_items")
    .select("*")
    .eq("user_id", userId)
    .eq("year_month", yearMonth)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const [debts, cards] = await Promise.all([
    fetchDebtsForMonth(yearMonth),
    fetchCardChargesForMonth(yearMonth),
  ]);

  return buildSummary(
    yearMonth,
    (data ?? []) as MonthlyItem[],
    debts,
    cards,
  );
}

export async function setItemPaid(itemId: string, isPaid: boolean) {
  const { supabase, userId } = await getAuthenticatedUserId();

  const { error } = await supabase
    .from("monthly_items")
    .update({ is_paid: isPaid })
    .eq("id", itemId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
}

export async function fetchYearSummaries(
  year: number,
): Promise<Record<string, MonthSummary>> {
  const months = Array.from(
    { length: 12 },
    (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`,
  );

  const summaries = await Promise.all(
    months.map((yearMonth) => ensureMonthAndFetchItems(yearMonth)),
  );

  return Object.fromEntries(
    summaries.map((summary) => [summary.yearMonth, summary]),
  );
}

export async function createItem(input: CreateItemInput) {
  const { supabase, userId } = await getAuthenticatedUserId();
  const sortOrder = await getNextSortOrder(
    supabase,
    userId,
    input.yearMonth,
    input.type,
  );

  if (input.isRecurring) {
    const { data: template, error: templateError } = await supabase
      .from("recurring_templates")
      .insert({
        user_id: userId,
        type: input.type,
        description: input.description,
        amount: input.amount,
        active: true,
        sort_order: sortOrder,
      })
      .select("*")
      .single();

    if (templateError) {
      throw new Error(templateError.message);
    }

    const { error: itemError } = await supabase.from("monthly_items").insert({
      user_id: userId,
      year_month: input.yearMonth,
      type: input.type,
      description: input.description,
      amount: input.amount,
      source: "recurring",
      recurring_template_id: template.id,
      is_modified: false,
      sort_order: sortOrder,
    });

    if (itemError) {
      throw new Error(itemError.message);
    }
  } else {
    const { error } = await supabase.from("monthly_items").insert({
      user_id: userId,
      year_month: input.yearMonth,
      type: input.type,
      description: input.description,
      amount: input.amount,
      source: "one_off",
      recurring_template_id: null,
      is_modified: false,
      sort_order: sortOrder,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/");
}

export async function updateItem(input: UpdateItemInput) {
  const { supabase, userId } = await getAuthenticatedUserId();

  const { data: existing, error: fetchError } = await supabase
    .from("monthly_items")
    .select("*")
    .eq("id", input.id)
    .eq("user_id", userId)
    .single();

  if (fetchError || !existing) {
    throw new Error(fetchError?.message ?? "Item no encontrado");
  }

  const item = existing as MonthlyItem;
  const isRecurring = item.source === "recurring" && item.recurring_template_id;

  if (isRecurring && input.updateTemplate) {
    const { error: templateError } = await supabase
      .from("recurring_templates")
      .update({
        description: input.description,
        amount: input.amount,
      })
      .eq("id", item.recurring_template_id!)
      .eq("user_id", userId);

    if (templateError) {
      throw new Error(templateError.message);
    }

    await syncUnmodifiedItemsFromTemplate(
      supabase,
      userId,
      item.recurring_template_id!,
      input.description,
      input.amount,
    );
  } else {
    const { error: updateError } = await supabase
      .from("monthly_items")
      .update({
        description: input.description,
        amount: input.amount,
        is_modified: isRecurring ? true : item.is_modified,
      })
      .eq("id", input.id)
      .eq("user_id", userId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  revalidatePath("/");
}

export async function deleteItem(id: string, deleteTemplate = false) {
  const { supabase, userId } = await getAuthenticatedUserId();

  const { data: existing, error: fetchError } = await supabase
    .from("monthly_items")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (fetchError || !existing) {
    throw new Error(fetchError?.message ?? "Item no encontrado");
  }

  const item = existing as MonthlyItem;

  if (deleteTemplate && item.recurring_template_id) {
    const { error: templateError } = await supabase
      .from("recurring_templates")
      .update({ active: false })
      .eq("id", item.recurring_template_id)
      .eq("user_id", userId);

    if (templateError) {
      throw new Error(templateError.message);
    }
  }

  const { error: deleteError } = await supabase
    .from("monthly_items")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidatePath("/");
}

export async function persistItemsLayout(input: PersistItemsLayoutInput) {
  const { supabase, userId } = await getAuthenticatedUserId();
  const allIds = [...input.incomeIds, ...input.expenseIds];

  if (!allIds.length) {
    return;
  }

  const { data: existingItems, error: fetchError } = await supabase
    .from("monthly_items")
    .select("*")
    .eq("user_id", userId)
    .eq("year_month", input.yearMonth)
    .in("id", allIds);

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const itemsById = new Map(
    ((existingItems ?? []) as MonthlyItem[]).map((item) => [item.id, item]),
  );

  for (const id of allIds) {
    if (!itemsById.has(id)) {
      throw new Error("Item no encontrado");
    }
  }

  const layout: Array<{ id: string; type: ItemType; sort_order: number }> = [
    ...input.incomeIds.map((id, index) => ({
      id,
      type: "income" as const,
      sort_order: index,
    })),
    ...input.expenseIds.map((id, index) => ({
      id,
      type: "expense" as const,
      sort_order: index,
    })),
  ];

  for (const entry of layout) {
    const item = itemsById.get(entry.id)!;
    const typeChanged = item.type !== entry.type;
    const isRecurring =
      item.source === "recurring" && item.recurring_template_id;

    const { error: itemError } = await supabase
      .from("monthly_items")
      .update({
        type: entry.type,
        sort_order: entry.sort_order,
        ...(typeChanged && isRecurring ? { is_modified: true } : {}),
      })
      .eq("id", entry.id)
      .eq("user_id", userId);

    if (itemError) {
      throw new Error(itemError.message);
    }

    if (isRecurring) {
      const templateUpdate: {
        sort_order: number;
        type?: ItemType;
      } = { sort_order: entry.sort_order };

      if (typeChanged) {
        templateUpdate.type = entry.type;
      }

      const { error: templateError } = await supabase
        .from("recurring_templates")
        .update(templateUpdate)
        .eq("id", item.recurring_template_id!)
        .eq("user_id", userId);

      if (templateError) {
        throw new Error(templateError.message);
      }

      const { error: syncSortError } = await supabase
        .from("monthly_items")
        .update({ sort_order: entry.sort_order })
        .eq("user_id", userId)
        .eq("recurring_template_id", item.recurring_template_id!);

      if (syncSortError) {
        throw new Error(syncSortError.message);
      }

      if (typeChanged) {
        const { error: syncTypeError } = await supabase
          .from("monthly_items")
          .update({ type: entry.type })
          .eq("user_id", userId)
          .eq("recurring_template_id", item.recurring_template_id!)
          .eq("is_modified", false);

        if (syncTypeError) {
          throw new Error(syncTypeError.message);
        }
      }
    }
  }

  revalidatePath("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
