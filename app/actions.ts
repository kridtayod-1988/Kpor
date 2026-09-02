"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function acceptTermsAction(termsVersionId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่พบผู้ใช้ที่เข้าสู่ระบบ" };

  const { error } = await supabase
    .from("terms_acceptance")
    .insert({ user_id: user.id, terms_version_id: termsVersionId });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function startAttemptAction(
  mode: "full100" | "category" | "year",
  categoryId: string | null,
  examYearId: string | null,
  instantReveal: boolean
) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("start_attempt", {
    p_mode: mode,
    p_category_id: categoryId,
    p_exam_year_id: examYearId,
    p_instant_reveal: instantReveal,
  });

  if (error) return { error: error.message };
  redirect(`/exam/${data}`);
}

export async function saveAnswerAction(attemptId: string, questionId: string, selectedIndex: number | null) {
  const supabase = createClient();
  const { error } = await supabase.rpc("save_attempt_answer", {
    p_attempt_id: attemptId,
    p_question_id: questionId,
    p_selected_index: selectedIndex,
  });
  if (error) return { error: error.message };
  return { success: true };
}

export async function toggleFlagAction(attemptId: string, questionId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("toggle_attempt_flag", {
    p_attempt_id: attemptId,
    p_question_id: questionId,
  });
  if (error) return { error: error.message };
  return { success: true };
}

export async function revealAnswerAction(questionId: string, attemptId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("reveal_question_answer", {
    p_question_id: questionId,
    p_attempt_id: attemptId,
  });
  if (error) return { error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return {
    success: true,
    correctIndex: row?.correct_answer_index as number,
    explanation: row?.explanation as string,
  };
}

export async function submitAttemptAction(attemptId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("submit_exam_attempt", {
    p_attempt_id: attemptId,
  });
  if (error) return { error: error.message };
  const result = Array.isArray(data) ? data[0] : data;
  return { success: true, result };
}
