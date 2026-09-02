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
    .from("exam_attempts")
    .select("*")
    .eq("id", params.attemptId)
    .eq("user_id", user.id)
    .single();

  if (!attempt) redirect("/exam-sets");
  if (!attempt.finished_at) redirect(`/exam/${attempt.id}`);

  const { data: review } = await supabase.rpc("get_attempt_review", {
    p_attempt_id: params.attemptId,
  });

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
    />
  );
}
