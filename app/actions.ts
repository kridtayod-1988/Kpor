"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult<T extends object = Record<string, never>> =
  | ({ success: true; error?: never } & T)
  | { success?: false; error: string };

export async function acceptTermsAction(termsVersionId: string): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่พบผู้ใช้ที่เข้าสู่ระบบ" };
  if (!termsVersionId) return { error: "ไม่พบข้อกำหนดที่ต้องการยอมรับ" };

  const { error } = await supabase
    .from("terms_acceptance")
    .insert({ user_id: user.id, terms_version_id: termsVersionId });

  // ยอมรับข้อกำหนดเดิมซ้ำได้โดยไม่ทำให้หน้าใช้งานล้มเหลว
  if (error && error.code !== "23505") return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Create an attempt through the database function.
 *
 * start_attempt validates that the set is published, enforces verification
 * requirements, and creates the attempt atomically. Do not insert directly
 * into user_attempts from the browser/server action.
 */
export async function startAttemptAction(
  examSetId: string
): Promise<ActionResult<{ attemptId: string }>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "กรุณาเข้าสู่ระบบก่อนเริ่มทำข้อสอบ" };
  if (!examSetId) return { error: "ไม่พบชุดข้อสอบที่ต้องการเริ่ม" };

  const { data: attemptId, error } = await supabase.rpc("start_attempt", {
    p_exam_set_id: examSetId,
  });

  if (error) return { error: error.message };
  if (typeof attemptId !== "string" || !attemptId) {
    return { error: "ระบบไม่สามารถสร้างรหัสการสอบได้ กรุณาลองใหม่" };
  }

  return { success: true, attemptId };
}

export async function saveAnswerAction(
  attemptId: string,
  questionId: string,
  selectedIndex: number | null,
  isFlagged: boolean
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("upsert_answer", {
    p_attempt_id: attemptId,
    p_question_id: questionId,
    p_selected_index: selectedIndex,
    p_is_flagged: isFlagged,
  });
  if (error) return { error: error.message };
  return { success: true };
}

export async function submitAttemptAction(
  attemptId: string
): Promise<ActionResult<{ result: unknown }>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("submit_attempt", {
    p_attempt_id: attemptId,
  });
  if (error) return { error: error.message };
  // supabase-js returns a single-row RETURNS TABLE result as an array.
  const result = Array.isArray(data) ? data[0] : data;
  return { success: true, result };
}

export async function revealAnswerAction(
  questionId: string,
  attemptId: string
): Promise<ActionResult<{ correctIndex: number; explanation: string }>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("reveal_question_answer", {
    p_question_id: questionId,
    p_attempt_id: attemptId,
  });
  if (error) return { error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { error: "ไม่พบเฉลยของข้อนี้" };
  return {
    success: true,
    correctIndex: row.correct_index as number,
    explanation: row.explanation as string,
  };
}
