import { createAdminClient } from "@/lib/supabase/server";

export interface SubmissionRecord {
  id: string;
  user_id: string;
  form_id: string;
  status: "draft" | "completed";
  form_data: Record<string, string>;
  current_step: number;
  output_pdf_path: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Finds the user's most recent in-progress draft for this form, or creates
 * a fresh one. This is what powers "save progress" / resume — a user who
 * navigates away and comes back to the same form picks up where they left
 * off instead of starting over.
 */
export async function getOrCreateDraft(
  userId: string,
  formId: string
): Promise<SubmissionRecord> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("submissions")
    .select("*")
    .eq("user_id", userId)
    .eq("form_id", formId)
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing as SubmissionRecord;

  const { data: created, error } = await supabase
    .from("submissions")
    .insert({
      user_id: userId,
      form_id: formId,
      status: "draft",
      form_data: {},
      current_step: 0,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return created as SubmissionRecord;
}
