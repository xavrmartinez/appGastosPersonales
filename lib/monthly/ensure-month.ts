import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecurringTemplate } from "@/types/database";

export async function ensureMonthItems(
  supabase: SupabaseClient,
  userId: string,
  yearMonth: string,
): Promise<void> {
  const { data: templates, error: templatesError } = await supabase
    .from("recurring_templates")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true);

  if (templatesError) {
    throw new Error(templatesError.message);
  }

  if (!templates?.length) {
    return;
  }

  const { data: existing, error: existingError } = await supabase
    .from("monthly_items")
    .select("recurring_template_id")
    .eq("user_id", userId)
    .eq("year_month", yearMonth)
    .not("recurring_template_id", "is", null);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingIds = new Set(
    existing?.map((item) => item.recurring_template_id).filter(Boolean) ?? [],
  );

  const toInsert = (templates as RecurringTemplate[])
    .filter((template) => !existingIds.has(template.id))
    .map((template) => ({
      user_id: userId,
      year_month: yearMonth,
      type: template.type,
      description: template.description,
      amount: template.amount,
      source: "recurring" as const,
      recurring_template_id: template.id,
      is_modified: false,
      sort_order: template.sort_order,
    }));

  if (!toInsert.length) {
    return;
  }

  const { error: insertError } = await supabase
    .from("monthly_items")
    .insert(toInsert);

  if (insertError) {
    throw new Error(insertError.message);
  }
}

export async function syncUnmodifiedItemsFromTemplate(
  supabase: SupabaseClient,
  userId: string,
  templateId: string,
  description: string,
  amount: number,
): Promise<void> {
  const { error } = await supabase
    .from("monthly_items")
    .update({ description, amount })
    .eq("user_id", userId)
    .eq("recurring_template_id", templateId)
    .eq("is_modified", false);

  if (error) {
    throw new Error(error.message);
  }
}
