import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ExamRunner from "@/components/ExamRunner";

const MODE_LABEL: Record<string, string> = {
  full100: "จำลองสนามจริง ก.พ.",
  category: "ติวเจาะรายหมวด",
  year: "คลังข้อสอบเก่า",
};

export default async function ExamPage({ params }: { params: { attemptId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("id", params.attemptId)
    .eq("user_id", user.id)
    .single();

  if (!attempt) redirect("/exam-sets");
  if (attempt.finished_at) redirect(`/result/${attempt.id}`);

  // system_config เก็บเวลาสอบของโหมด full100 เท่านั้น โหมด category/year ไม่จำกัดเวลา
  let timeLimitMinutes = 0;
  if (attempt.mode === "full100") {
    const { data: config } = await supabase
      .from("system_config")
      .select("full_exam_time_minutes")
      .eq("key", "public")
      .single();
    timeLimitMinutes = config?.full_exam_time_minutes ?? 0;
  }

  const { data: safeQuestions } = await supabase
    .from("questions_public")
    .select("id, category_id, exam_year_id, question_text, table_data, options, difficulty")
    .in("id", attempt.question_ids);

  const byId = new Map((safeQuestions ?? []).map((q) => [q.id, q]));
  // เรียงคำถามตามลำดับใน question_ids (ลำดับที่ start_attempt สุ่มไว้)
  const questions = attempt.question_ids
    .map((id: string) => byId.get(id))
    .filter((q: unknown): q is NonNullable<typeof q> => !!q);

  if (questions.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400 text-sm">
        ไม่พบคำถามของชุดข้อสอบนี้ — กรุณาติดต่อผู้ดูแลระบบ
      </div>
    );
  }

  let categoryOrYearLabel = "";
  if (attempt.category_id) {
    const { data } = await supabase.from("categories").select("name").eq("id", attempt.category_id).single();
    categoryOrYearLabel = data?.name ?? "";
  } else if (attempt.exam_year_id) {
    const { data } = await supabase.from("exam_years").select("label").eq("id", attempt.exam_year_id).single();
    categoryOrYearLabel = data?.label ?? "";
  }

  return (
    <ExamRunner
      attemptId={attempt.id}
      instantReveal={attempt.instant_reveal}
      startedAt={attempt.started_at}
      timeLimitMinutes={timeLimitMinutes}
      examLabel={categoryOrYearLabel || MODE_LABEL[attempt.mode] || "ทำข้อสอบ"}
      questions={questions}
      initialAnswers={attempt.user_answers}
      initialFlags={attempt.flagged_question_ids}
    />
  );
}
