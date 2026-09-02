import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ResultView from "@/components/ResultView";

export default async function ResultPage({ params }: { params: { attemptId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: attempt } = await supabase
<<<<<<< HEAD
    .from("user_attempts")
=======
    .from("exam_attempts")
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
    .select("*")
    .eq("id", params.attemptId)
    .eq("user_id", user.id)
    .single();

  if (!attempt) redirect("/exam-sets");
<<<<<<< HEAD

  // ยังไม่ได้ส่งข้อสอบ -> กลับไปหน้าสอบต่อ
  if (!attempt.finished_at) {
    redirect(`/exam/${attempt.exam_set_id}?attempt=${attempt.id}`);
  }

  const { data: examSet } = await supabase
    .from("exam_sets")
    .select("*")
    .eq("id", attempt.exam_set_id)
    .single();

  const { data: sections } = examSet?.is_gpa3
    ? await supabase
        .from("exam_set_sections")
        .select("*")
        .eq("exam_set_id", attempt.exam_set_id)
        .order("sort_order", { ascending: true })
    : { data: [] };
=======
  if (!attempt.finished_at) redirect(`/exam/${attempt.id}`);
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc

  const { data: review } = await supabase.rpc("get_attempt_review", {
    p_attempt_id: params.attemptId,
  });

<<<<<<< HEAD
  return (
    <ResultView
      examSetName={examSet?.name ?? "ผลการทำข้อสอบ"}
      rawScore={attempt.raw_score ?? 0}
      maxScore={attempt.max_score ?? examSet?.max_score ?? 0}
      passed={!!attempt.passed}
      passedSections={attempt.passed_sections}
      isGpa3={!!examSet?.is_gpa3}
      sections={sections ?? []}
      review={review ?? []}
      elapsedSeconds={attempt.elapsed_seconds}
=======
  const { data: categories } = await supabase.from("categories").select("id, name");
  const categoryNames = Object.fromEntries((categories ?? []).map((c) => [c.id, c.name]));

  let examLabel = "จำลองสนามจริง ก.พ.";
  if (attempt.category_id) {
    examLabel = categoryNames[attempt.category_id] ?? examLabel;
  } else if (attempt.exam_year_id) {
    const { data } = await supabase.from("exam_years").select("label").eq("id", attempt.exam_year_id).single();
    examLabel = data?.label ?? examLabel;
  }

  return (
    <ResultView
      examLabel={examLabel}
      score={attempt.score}
      totalQuestions={attempt.total_questions}
      expGained={attempt.exp_gained}
      durationSeconds={attempt.duration_seconds}
      review={review ?? []}
      categoryNames={categoryNames}
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
    />
  );
}
