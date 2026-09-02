import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ExamRunner from "@/components/ExamRunner";

export default async function ExamPage({
  params,
  searchParams,
}: {
  params: { setId: string };
  searchParams: { attempt?: string };
}) {
  const supabase = createClient();
  const attemptId = searchParams.attempt;
  if (!attemptId) redirect("/exam-sets");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // attempt (RLS: เฉพาะเจ้าของ) — ถ้าส่งไปแล้วให้เด้งไปหน้าผลสอบเลย
  const { data: attempt } = await supabase
    .from("user_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .single();

  if (!attempt) redirect("/exam-sets");
  if (attempt.finished_at) redirect(`/result/${attempt.id}`);

  const { data: examSet } = await supabase
    .from("exam_sets")
    .select("*")
    .eq("id", params.setId)
    .single();

  if (!examSet) redirect("/exam-sets");

  // ลำดับคำถามของชุดนี้ (ไม่มีเฉลย)
  const { data: setQuestions } = await supabase
    .from("exam_set_questions")
    .select("question_id, position, points")
    .eq("exam_set_id", params.setId)
    .order("position", { ascending: true });

  const questionIds = (setQuestions ?? []).map((r) => r.question_id);

  const { data: safeQuestions } = await supabase
    .from("questions_public")
    .select("id, subcategory_id, text, passage, choices")
    .in("id", questionIds.length > 0 ? questionIds : ["00000000-0000-0000-0000-000000000000"]);

  const byId = new Map((safeQuestions ?? []).map((q) => [q.id, q]));
  const questions = (setQuestions ?? [])
    .map((sq) => {
      const q = byId.get(sq.question_id);
      if (!q) return null;
      return { ...q, position: sq.position, points: sq.points as number };
    })
    .filter((q): q is NonNullable<typeof q> => q !== null);

  // คำตอบที่เคยบันทึกไว้ (กรณีรีเฟรชหน้ากลางคัน)
  const { data: existingAnswers } = await supabase
    .from("user_answers")
    .select("question_id, selected_index, is_flagged")
    .eq("attempt_id", attemptId);

  const initialAnswers: Record<string, { selected_index: number | null; is_flagged: boolean }> = {};
  for (const a of existingAnswers ?? []) {
    initialAnswers[a.question_id] = { selected_index: a.selected_index, is_flagged: a.is_flagged };
  }

  if (questions.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400 text-sm">
        ชุดข้อสอบนี้ยังไม่มีคำถามในคลัง — กรุณาติดต่อผู้ดูแลระบบ
      </div>
    );
  }

  return (
    <ExamRunner
      attemptId={attempt.id}
      mode={attempt.mode}
      startedAt={attempt.started_at}
      timeLimitMinutes={examSet.time_limit_minutes ?? 0}
      examSetName={examSet.name}
      questions={questions}
      initialAnswers={initialAnswers}
    />
  );
}
