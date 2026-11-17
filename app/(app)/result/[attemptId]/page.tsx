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

  const { data: review } = await supabase.rpc("get_attempt_review", {
    p_attempt_id: attemptId,
  });

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
    />
  );
}
