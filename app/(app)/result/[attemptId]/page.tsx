import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ResultView from "@/components/ResultView";

export default async function ResultPage({
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

  const { data: attempt } = await supabase
    .from("user_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .single();

  if (!attempt) redirect("/exam-sets");

  // An unfinished attempt must be resumed using its attempt ID.
  if (!attempt.finished_at) {
    redirect(`/exam/${attempt.id}`);
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

  const [{ data: review }, { data: questionMappings }] = await Promise.all([
    supabase.rpc("get_attempt_review", { p_attempt_id: attemptId }),
    supabase
      .from("exam_set_questions")
      .select("question_id, points")
      .eq("exam_set_id", attempt.exam_set_id),
  ]);

  // Preserve the configured points per question for section-level GPA3 scoring.
  const pointsByQuestion = new Map<string, number>();
  for (const item of questionMappings ?? []) {
    pointsByQuestion.set(item.question_id, Number(item.points ?? 0));
  }
  const reviewWithPoints = (review ?? []).map((row) => ({
    ...row,
    points: pointsByQuestion.get(row.question_id) ?? 0,
  }));

  return (
    <ResultView
      examSetName={examSet?.name ?? "ผลการทำข้อสอบ"}
      rawScore={attempt.raw_score ?? 0}
      maxScore={attempt.max_score ?? examSet?.max_score ?? 0}
      passed={!!attempt.passed}
      passedSections={attempt.passed_sections}
      isGpa3={!!examSet?.is_gpa3}
      sections={sections ?? []}
      review={reviewWithPoints}
      elapsedSeconds={attempt.elapsed_seconds}
    />
  );
}
