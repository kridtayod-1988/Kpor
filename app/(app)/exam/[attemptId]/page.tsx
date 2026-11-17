import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ExamRunner from "@/components/ExamRunner";

type PublicQuestion = {
  id: string;
  subcategory_id: string;
  text: string;
  passage: string | null;
  choices: string[];
};

type AttemptAnswer = {
  question_id: string;
  selected_index: number | null;
  is_flagged: boolean;
};

export default async function ExamPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Use the same user_attempts record created by start_attempt().
  const { data: attempt, error: attemptError } = await supabase
    .from("user_attempts")
    .select("id, user_id, exam_set_id, mode, started_at, finished_at")
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .single();

  if (attemptError || !attempt) redirect("/exam-sets");
  if (attempt.finished_at) redirect(`/result/${attempt.id}`);

  if (!attempt.exam_set_id) redirect("/exam-sets");

  const [
    { data: examSet, error: examSetError },
    { data: mappings, error: mappingsError },
    { data: answerRows, error: answersError },
  ] = await Promise.all([
    supabase
      .from("exam_sets")
      .select("id, name, time_limit_minutes")
      .eq("id", attempt.exam_set_id)
      .single(),
    supabase
      .from("exam_set_questions")
      .select("question_id, position, points")
      .eq("exam_set_id", attempt.exam_set_id)
      .order("position", { ascending: true }),
    supabase
      .from("user_answers")
      .select("question_id, selected_index, is_flagged")
      .eq("attempt_id", attempt.id),
  ]);

  if (examSetError || !examSet || mappingsError || answersError) {
    return (
      <div className="py-16 text-center text-sm text-red-600">
        โหลดข้อมูลการสอบไม่สำเร็จ กรุณารีเฟรชหน้า หรือติดต่อผู้ดูแลระบบ
      </div>
    );
  }

  const questionIds = (mappings ?? []).map((item) => item.question_id);
  if (questionIds.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500 text-sm">
        ชุดข้อสอบนี้ยังไม่มีคำถาม กรุณาติดต่อผู้ดูแลระบบ
      </div>
    );
  }

  // questions_public deliberately omits correct answers and explanations.
  const { data: publicRows, error: questionsError } = await supabase
    .from("questions_public")
    .select("id, subcategory_id, text, passage, choices")
    .in("id", questionIds);

  if (questionsError || !publicRows) {
    return (
      <div className="py-16 text-center text-sm text-red-600">
        โหลดโจทย์ข้อสอบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
      </div>
    );
  }

  const questionById = new Map<string, PublicQuestion>(
    publicRows.map((question) => [question.id, question as PublicQuestion])
  );

  // Preserve the position/points defined by exam_set_questions.
  const questions = (mappings ?? []).flatMap((mapping) => {
    const question = questionById.get(mapping.question_id);
    if (!question) return [];
    return [{
      ...question,
      position: mapping.position,
      points: Number(mapping.points ?? 0),
    }];
  });

  if (questions.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500 text-sm">
        ไม่พบคำถามที่เปิดใช้งานในชุดข้อสอบนี้ — กรุณาติดต่อผู้ดูแลระบบ
      </div>
    );
  }

  const initialAnswers: Record<string, { selected_index: number | null; is_flagged: boolean }> = {};
  for (const row of (answerRows ?? []) as AttemptAnswer[]) {
    initialAnswers[row.question_id] = {
      selected_index: row.selected_index,
      is_flagged: row.is_flagged,
    };
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
