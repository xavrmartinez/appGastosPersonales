"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  debtAppliesToMonth,
  toDebtMonthEntry,
} from "@/lib/debts/utils";
import { createClient } from "@/lib/supabase/server";
import type {
  CreateDebtInput,
  Debt,
  DebtMonthEntry,
  UpdateDebtInput,
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

async function getNextDebtSortOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("debts")
    .select("sort_order")
    .eq("user_id", userId)
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

export async function fetchDebtsForMonth(
  yearMonth: string,
): Promise<DebtMonthEntry[]> {
  const { supabase, userId } = await getAuthenticatedUserId();

  const { data, error } = await supabase
    .from("debts")
    .select("*")
    .eq("user_id", userId)
    .not("pay_year_month", "is", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Debt[])
    .filter((debt) => debtAppliesToMonth(debt, yearMonth))
    .map((debt) => toDebtMonthEntry(debt, yearMonth));
}

export async function fetchAllDebts(): Promise<Debt[]> {
  const { supabase, userId } = await getAuthenticatedUserId();

  const { data, error } = await supabase
    .from("debts")
    .select("*")
    .eq("user_id", userId)
    .order("pay_year_month", { ascending: true, nullsFirst: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Debt[];
}

export async function createDebt(input: CreateDebtInput) {
  const { supabase, userId } = await getAuthenticatedUserId();
  validateInstallmentCount(input.installmentCount);
  const sortOrder = await getNextDebtSortOrder(supabase, userId);

  const { error } = await supabase.from("debts").insert({
    user_id: userId,
    description: input.description,
    amount: input.amount,
    pay_year_month: input.payYearMonth,
    installment_count: input.installmentCount,
    sort_order: sortOrder,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/deudas");
}

export async function updateDebt(input: UpdateDebtInput) {
  const { supabase, userId } = await getAuthenticatedUserId();
  validateInstallmentCount(input.installmentCount);

  const { error } = await supabase
    .from("debts")
    .update({
      description: input.description,
      amount: input.amount,
      pay_year_month: input.payYearMonth,
      installment_count: input.installmentCount,
    })
    .eq("id", input.id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/deudas");
}

export async function deleteDebt(id: string) {
  const { supabase, userId } = await getAuthenticatedUserId();

  const { error } = await supabase
    .from("debts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/deudas");
}
