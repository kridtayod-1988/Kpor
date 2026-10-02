"use server";

import { revalidatePath } from "next/cache";
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

export async function startAttemptAction(examSetId: string, mode: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "กรุณาเข้าสู่ระบบก่อนเริ่มทำข้อสอบ" };

  const { data, error } = await supabase
    .from("user_attempts")
    .insert({ user_id: user.id, exam_set_id: examSetId, mode })
    .select("id")
    .single();

  if (error) return { error: error.message };

  return { success: true, attemptId: data.id };
}

export async function saveAnswerAction(
  attemptId: string,
  questionId: string,
  selectedIndex: number | null,
  isFlagged: boolean
) {
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

export async function submitAttemptAction(attemptId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("submit_attempt", {
    p_attempt_id: attemptId,
  });
  if (error) return { error: error.message };
  // supabase-js คืนค่า RPC ที่เป็น `returns table` เป็น array ของแถวเดียว
  const result = Array.isArray(data) ? data[0] : data;
  return { success: true, result };
}

export async function revealAnswerAction(questionId: string, attemptId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("reveal_question_answer", {
    p_question_id: questionId,
    p_attempt_id: attemptId,
  });
  if (error) return { error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return { success: true, correctIndex: row?.correct_index as number, explanation: row?.explanation as string };
}
