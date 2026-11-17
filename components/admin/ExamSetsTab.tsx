"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type ExamSetRow = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  mode: string;
  question_count: number;
  max_score: number;
  pass_score: number;
  time_limit_minutes: number;
  is_published: boolean;
};

type Subcategory = {
  id: string;
  name: string;
  group_id: string;
};

type QuestionRow = {
  id: string;
  subcategory_id: string;
  text: string;
  source_round: string;
  difficulty: number;
  question_type: string;
};

type AssignmentRow = {
  id: string;
  question_id: string;
  position: number;
  points: number;
};

type AssignedQuestion = QuestionRow & {
  mappingId: string;
  position: number;
  points: number;
};

const EMPTY_FORM = {
  slug: "",
  name: "",
  description: "",
  mode: "archive",
  question_count: 25,
  max_score: 50,
  pass_score: 30,
  time_limit_minutes: 60,
};

const QUESTION_SELECT =
  "id, subcategory_id, text, source_round, difficulty, question_type";

export default function ExamSetsTab() {
  const supabase = createClient();
  const [sets, setSets] = useState<ExamSetRow[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [assigned, setAssigned] = useState<AssignedQuestion[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<QuestionRow[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [hasAttempts, setHasAttempts] = useState(false);
  const [builderLoadFailed, setBuilderLoadFailed] = useState(false);
  const [questionSearch, setQuestionSearch] = useState("");
  const [questionFilter, setQuestionFilter] = useState("ALL");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [builderMessage, setBuilderMessage] = useState<string | null>(null);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [busyQuestionId, setBusyQuestionId] = useState<string | null>(null);

  const selectedSet = sets.find((set) => set.id === selectedSetId) ?? null;
  const assignedIds = new Set(assigned.map((row) => row.id));
  const totalAssignedPoints = assigned.reduce((sum, row) => sum + Number(row.points || 0), 0);
  const structureLocked = builderLoadFailed || hasAttempts || Boolean(selectedSet?.is_published);

  const loadSets = async () => {
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await supabase
      .from("exam_sets")
      .select("id, slug, name, description, mode, question_count, max_score, pass_score, time_limit_minutes, is_published")
      .order("created_at", { ascending: false });

    if (loadError) {
      setError(loadError.message);
      setSets([]);
    } else {
      setSets((data as ExamSetRow[]) ?? []);
    }
    setLoading(false);
  };

  const loadSubcategories = async () => {
    const { data, error: loadError } = await supabase
      .from("subcategories")
      .select("id, name, group_id")
      .order("sort_order", { ascending: true });

    if (loadError) {
      setBuilderError(loadError.message);
      return;
    }
    setSubcategories((data as Subcategory[]) ?? []);
  };

  const loadAssignments = async (examSetId: string) => {
    setAssignmentsLoading(true);
    setBuilderLoadFailed(true);
    setBuilderError(null);

    const [{ data: mappingRows, error: mappingError }, { data: attemptRows, error: attemptError }] =
      await Promise.all([
        supabase
          .from("exam_set_questions")
          .select("id, question_id, position, points")
          .eq("exam_set_id", examSetId)
          .order("position", { ascending: true }),
        supabase
          .from("user_attempts")
          .select("id")
          .eq("exam_set_id", examSetId)
          .limit(1),
      ]);

    if (mappingError || attemptError) {
      setBuilderError(mappingError?.message ?? attemptError?.message ?? "โหลดชุดข้อสอบไม่สำเร็จ");
      setAssigned([]);
      setAssignmentsLoading(false);
      return;
    }

    setHasAttempts((attemptRows ?? []).length > 0);
    const mappings = (mappingRows as AssignmentRow[]) ?? [];
    if (mappings.length === 0) {
      setAssigned([]);
      setBuilderLoadFailed(false);
      setAssignmentsLoading(false);
      return;
    }

    const questionIds = mappings.map((mapping) => mapping.question_id);
    const { data: questionRows, error: questionError } = await supabase
      .from("questions")
      .select(QUESTION_SELECT)
      .in("id", questionIds);

    if (questionError) {
      setBuilderError(questionError.message);
      setAssigned([]);
      setAssignmentsLoading(false);
      return;
    }

    const questionById = new Map<string, QuestionRow>();
    for (const row of (questionRows ?? []) as QuestionRow[]) {
      questionById.set(row.id, row);
    }

    const missingQuestion = mappings.some((mapping) => !questionById.has(mapping.question_id));
    if (missingQuestion) {
      setBuilderError("มีรายการคำถามที่ผูกกับชุดนี้แต่ไม่สามารถโหลดข้อมูลได้ จึงล็อกการแก้ไขไว้ก่อน");
      setAssigned([]);
      setAssignmentsLoading(false);
      return;
    }

    setAssigned(
      mappings.flatMap((mapping) => {
        const question = questionById.get(mapping.question_id);
        if (!question) return [];
        return [{
          ...question,
          mappingId: mapping.id,
          position: mapping.position,
          points: Number(mapping.points),
        }];
      })
    );
    setBuilderLoadFailed(false);
    setAssignmentsLoading(false);
  };

  const loadAvailableQuestions = async () => {
    if (!selectedSetId) return;
    setQuestionsLoading(true);
    setBuilderError(null);

    let query = supabase
      .from("questions")
      .select(QUESTION_SELECT)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(500);

    if (questionFilter !== "ALL") query = query.eq("subcategory_id", questionFilter);
    if (questionSearch.trim()) query = query.ilike("text", `%${questionSearch.trim()}%`);

    const { data, error: queryError } = await query;
    if (queryError) {
      setBuilderError(queryError.message);
      setAvailableQuestions([]);
    } else {
      setAvailableQuestions(
        ((data ?? []) as QuestionRow[]).filter((question) => !assignedIds.has(question.id))
      );
    }
    setQuestionsLoading(false);
  };

  useEffect(() => {
    void loadSets();
    void loadSubcategories();
    // Supabase browser client is stable for this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedSetId) return;
    void loadAssignments(selectedSetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSetId]);

  useEffect(() => {
    if (!selectedSetId) return;
    void loadAvailableQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSetId, questionFilter]);

  useEffect(() => {
    if (!selectedSetId) return;
    const timer = window.setTimeout(() => void loadAvailableQuestions(), 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionSearch]);

  const openBuilder = (examSetId: string) => {
    setSelectedQuestionIds([]);
    setQuestionSearch("");
    setQuestionFilter("ALL");
    setBuilderError(null);
    setBuilderMessage(null);
    // Lock controls immediately while history and mappings are being verified.
    setBuilderLoadFailed(true);
    setSelectedSetId(examSetId);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const name = form.name.trim();
    const questionCount = Number(form.question_count);
    const maxScore = Number(form.max_score);
    const passScore = Number(form.pass_score);
    const timeLimit = Number(form.time_limit_minutes);

    if (!name) {
      setError("กรุณากรอกชื่อชุดข้อสอบ");
      return;
    }
    if (!Number.isInteger(questionCount) || questionCount < 1) {
      setError("จำนวนข้อต้องเป็นจำนวนเต็มอย่างน้อย 1 ข้อ");
      return;
    }
    if (!Number.isInteger(maxScore) || maxScore <= 0 || !Number.isInteger(passScore) || passScore < 0 || passScore > maxScore) {
      setError("คะแนนเต็มและเกณฑ์ผ่านต้องเป็นจำนวนเต็ม โดยเกณฑ์ผ่านต้องไม่เกินคะแนนเต็ม");
      return;
    }
    if (!Number.isInteger(timeLimit) || timeLimit < 0) {
      setError("เวลาในการสอบต้องเป็น 0 หรือจำนวนนาทีที่มากกว่า 0");
      return;
    }

    setSaving(true);
    const { data, error: insertError } = await supabase
      .from("exam_sets")
      .insert({
        slug: form.slug.trim() || null,
        name,
        description: form.description.trim() || null,
        mode: form.mode,
        question_count: questionCount,
        max_score: maxScore,
        pass_score: passScore,
        time_limit_minutes: timeLimit,
        is_published: false,
      })
      .select("id")
      .single();

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setForm(EMPTY_FORM);
    setShowForm(false);
    await loadSets();
    if (data?.id) {
      openBuilder(data.id);
      setBuilderMessage("สร้างชุดข้อสอบแล้ว เพิ่มคำถามให้ครบก่อนเผยแพร่");
    }
  };

  const handleDelete = async (examSetId: string) => {
    const targetSet = sets.find((set) => set.id === examSetId);
    if (targetSet?.is_published) {
      setError("กรุณาซ่อนชุดข้อสอบก่อนลบ");
      return;
    }
    const { data: attempts, error: attemptError } = await supabase
      .from("user_attempts")
      .select("id")
      .eq("exam_set_id", examSetId)
      .limit(1);

    if (attemptError) {
      setError(attemptError.message);
      return;
    }
    if (attempts && attempts.length > 0) {
      setError("ชุดข้อสอบนี้มีประวัติการสอบแล้ว จึงลบไม่ได้");
      return;
    }
    if (!window.confirm("ยืนยันลบชุดข้อสอบนี้? รายการคำถามและหมวดคะแนนที่ผูกอยู่จะถูกลบด้วย")) return;

    setError(null);
    const { error: deleteError } = await supabase.from("exam_sets").delete().eq("id", examSetId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setSets((previous) => previous.filter((set) => set.id !== examSetId));
    if (selectedSetId === examSetId) setSelectedSetId(null);
  };

  const togglePublish = async () => {
    if (!selectedSet || busyQuestionId !== null) return;
    setBuilderError(null);
    setBuilderMessage(null);

    if (!selectedSet.is_published) {
      if (assigned.length !== selectedSet.question_count) {
        setBuilderError(`ต้องจัดคำถามให้ครบ ${selectedSet.question_count} ข้อก่อนเผยแพร่ (ขณะนี้ ${assigned.length} ข้อ)`);
        return;
      }
      if (Math.abs(totalAssignedPoints - selectedSet.max_score) > 0.0001) {
        setBuilderError(`คะแนนรวมจากคำถาม ${totalAssignedPoints} คะแนน ไม่ตรงกับคะแนนเต็ม ${selectedSet.max_score} คะแนน`);
        return;
      }
    }

    const { error: updateError } = await supabase
      .from("exam_sets")
      .update({ is_published: !selectedSet.is_published })
      .eq("id", selectedSet.id);

    if (updateError) {
      setBuilderError(updateError.message);
      return;
    }

    setSets((previous) => previous.map((set) =>
      set.id === selectedSet.id ? { ...set, is_published: !selectedSet.is_published } : set
    ));
    setBuilderMessage(selectedSet.is_published ? "ซ่อนชุดข้อสอบแล้ว" : "เผยแพร่ชุดข้อสอบแล้ว");
  };

  const addSelectedQuestions = async () => {
    if (!selectedSet || structureLocked || selectedQuestionIds.length === 0) return;
    setBuilderError(null);
    setBuilderMessage(null);

    const remaining = selectedSet.question_count - assigned.length;
    if (selectedQuestionIds.length > remaining) {
      setBuilderError(`เพิ่มได้อีกไม่เกิน ${Math.max(remaining, 0)} ข้อ เพื่อให้ตรงกับจำนวนที่กำหนด`);
      return;
    }

    setSaving(true);
    const firstPosition = assigned.reduce((maximum, row) => Math.max(maximum, row.position), 0) + 1;
    const rows = selectedQuestionIds.map((questionId, index) => ({
      exam_set_id: selectedSet.id,
      question_id: questionId,
      position: firstPosition + index,
      points: 2,
    }));

    const { error: insertError } = await supabase.from("exam_set_questions").insert(rows);
    setSaving(false);
    if (insertError) {
      setBuilderError(insertError.message);
      return;
    }

    setSelectedQuestionIds([]);
    await loadAssignments(selectedSet.id);
    await loadAvailableQuestions();
    setBuilderMessage(`เพิ่มคำถาม ${rows.length} ข้อแล้ว`);
  };

  const removeAssignedQuestion = async (row: AssignedQuestion) => {
    if (!selectedSet || structureLocked) return;
    setBusyQuestionId(row.mappingId);
    setBuilderError(null);
    const { error: deleteError } = await supabase
      .from("exam_set_questions")
      .delete()
      .eq("id", row.mappingId)
      .eq("exam_set_id", selectedSet.id);
    setBusyQuestionId(null);

    if (deleteError) {
      setBuilderError(deleteError.message);
      return;
    }
    await loadAssignments(selectedSet.id);
    await loadAvailableQuestions();
  };

  const moveAssignedQuestion = async (index: number, direction: -1 | 1) => {
    if (!selectedSet || structureLocked) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= assigned.length) return;

    const current = assigned[index];
    const target = assigned[targetIndex];
    const temporaryPosition = assigned.reduce((maximum, row) => Math.max(maximum, row.position), 0) + 1000;
    setBusyQuestionId(current.mappingId);
    setBuilderError(null);

    const first = await supabase
      .from("exam_set_questions")
      .update({ position: temporaryPosition })
      .eq("id", current.mappingId);
    if (first.error) {
      setBuilderError(first.error.message);
      setBusyQuestionId(null);
      return;
    }

    const second = await supabase
      .from("exam_set_questions")
      .update({ position: current.position })
      .eq("id", target.mappingId);
    if (second.error) {
      await supabase.from("exam_set_questions")
        .update({ position: current.position })
        .eq("id", current.mappingId);
      setBuilderError(second.error.message);
      setBusyQuestionId(null);
      await loadAssignments(selectedSet.id);
      return;
    }

    const third = await supabase
      .from("exam_set_questions")
      .update({ position: target.position })
      .eq("id", current.mappingId);
    setBusyQuestionId(null);

    if (third.error) {
      setBuilderError(third.error.message);
      await loadAssignments(selectedSet.id);
      return;
    }
    await loadAssignments(selectedSet.id);
  };

  const updatePoints = async (row: AssignedQuestion, value: number) => {
    if (!selectedSet || structureLocked) return;
    if (!Number.isFinite(value) || value <= 0) {
      setBuilderError("คะแนนรายข้อต้องมากกว่า 0");
      await loadAssignments(selectedSet.id);
      return;
    }
    setBusyQuestionId(row.mappingId);
    setBuilderError(null);

    const { error: updateError } = await supabase
      .from("exam_set_questions")
      .update({ points: value })
      .eq("id", row.mappingId);
    setBusyQuestionId(null);

    if (updateError) {
      setBuilderError(updateError.message);
      return;
    }
    await loadAssignments(selectedSet.id);
  };

  const availableNotAssigned = availableQuestions.filter((question) =>
    !assigned.some((row) => row.id === question.id)
  );

  return (
    <div className="flex flex-col gap-4">
      {!selectedSet ? (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-extrabold text-gray-900">จัดการชุดข้อสอบ</div>
              <p className="text-xs text-gray-500 mt-1">สร้างชุดข้อสอบ แล้วจัดคำถาม ลำดับ และคะแนนก่อนเผยแพร่</p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm((value) => !value)}
              className="self-start px-4 py-2 bg-indigo rounded-lg text-white text-sm font-bold"
            >
              {showForm ? "ยกเลิก" : "+ สร้างชุดข้อสอบใหม่"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3">
              <div className="font-bold text-gray-900 text-sm">ข้อมูลชุดข้อสอบ</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="ชื่อชุดข้อสอบ"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  required
                />
                <input
                  value={form.slug}
                  onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                  placeholder="Slug เช่น SIM004 (ไม่บังคับ)"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <select
                  value={form.mode}
                  onChange={(event) => setForm((current) => ({ ...current, mode: event.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="archive">คลังข้อสอบเก่า (archive)</option>
                  <option value="simulation">จำลองสนามสอบ (simulation)</option>
                  <option value="practice">ฝึกพร้อมเฉลย (practice)</option>
                  <option value="workshop">แบบฝึกหัดกำหนดเอง (workshop)</option>
                  <option value="category">ติวเจาะรายหมวด (category)</option>
                </select>
                <input
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="รายละเอียด (ไม่บังคับ)"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <label className="text-xs text-gray-600 flex flex-col gap-1">
                  จำนวนข้อที่ต้องจัด
                  <input
                    type="number"
                    min={1}
                    value={form.question_count}
                    onChange={(event) => setForm((current) => ({ ...current, question_count: Number(event.target.value) }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </label>
                <label className="text-xs text-gray-600 flex flex-col gap-1">
                  คะแนนเต็ม
                  <input
                    type="number"
                    min={1}
                    step="1"
                    value={form.max_score}
                    onChange={(event) => setForm((current) => ({ ...current, max_score: Number(event.target.value) }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </label>
                <label className="text-xs text-gray-600 flex flex-col gap-1">
                  เกณฑ์ผ่าน
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={form.pass_score}
                    onChange={(event) => setForm((current) => ({ ...current, pass_score: Number(event.target.value) }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </label>
                <label className="text-xs text-gray-600 flex flex-col gap-1">
                  เวลา (นาที, 0 = ไม่จำกัด)
                  <input
                    type="number"
                    min={0}
                    value={form.time_limit_minutes}
                    onChange={(event) => setForm((current) => ({ ...current, time_limit_minutes: Number(event.target.value) }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </label>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex items-center gap-2 flex-wrap">
                <button type="submit" disabled={saving} className="px-5 py-2 bg-green-600 rounded-lg text-white text-sm font-bold disabled:opacity-60">
                  {saving ? "กำลังสร้าง..." : "สร้างชุดข้อสอบ"}
                </button>
                <span className="text-xs text-gray-400">ชุดใหม่จะยังไม่เผยแพร่จนกว่าจะจัดข้อสอบครบ</span>
              </div>
            </form>
          )}

          {error && !showForm && <p className="text-xs text-red-600">{error}</p>}

          {loading ? (
            <div className="text-sm text-gray-400 py-10 text-center">กำลังโหลด...</div>
          ) : (
            <div className="flex flex-col gap-2">
              {sets.map((set) => (
                <div key={set.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-[220px]">
                    <div className="font-bold text-gray-900 text-sm">{set.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {set.slug ?? "ไม่มี slug"} · {set.mode} · {set.question_count} ข้อ · {set.max_score} คะแนน · ผ่าน {set.pass_score}
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${set.is_published ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {set.is_published ? "เผยแพร่อยู่" : "ฉบับร่าง"}
                  </span>
                  <button
                    type="button"
                    onClick={() => openBuilder(set.id)}
                    className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 text-xs font-semibold"
                  >
                    จัดคำถาม
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(set.id)}
                    className="px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs font-semibold"
                  >
                    ลบ
                  </button>
                </div>
              ))}
              {sets.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">ยังไม่มีชุดข้อสอบ</div>}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <button type="button" onClick={() => setSelectedSetId(null)} className="text-xs text-indigo-700 font-semibold mb-2">
                ← กลับไปยังชุดข้อสอบ
              </button>
              <h3 className="font-extrabold text-gray-900">{selectedSet.name}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {selectedSet.slug ?? "ไม่มี slug"} · {selectedSet.mode} · ต้องจัด {selectedSet.question_count} ข้อ · คะแนนเต็ม {selectedSet.max_score}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${selectedSet.is_published ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {selectedSet.is_published ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
              </span>
              <button
                type="button"
                onClick={() => void togglePublish()}
                disabled={saving || assignmentsLoading || busyQuestionId !== null}
                className="px-3.5 py-2 rounded-lg bg-indigo text-white text-xs font-bold disabled:opacity-50"
              >
                {selectedSet.is_published ? "ซ่อนชุดข้อสอบ" : "ตรวจและเผยแพร่"}
              </button>
            </div>
          </div>

          {hasAttempts ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              ชุดข้อสอบนี้มีประวัติการสอบแล้ว ระบบล็อกการเพิ่ม ลบ เรียงลำดับ และเปลี่ยนคะแนนรายข้อ เพื่อรักษาผลย้อนหลัง
            </div>
          ) : builderLoadFailed ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              ไม่สามารถตรวจสอบข้อมูลชุดข้อสอบ/ประวัติการสอบได้ จึงปิดการแก้ไขไว้ก่อน กรุณารีเฟรชหรือแก้ไขการเชื่อมต่อแล้วลองใหม่
            </div>
          ) : selectedSet.is_published ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              ชุดข้อสอบกำลังเผยแพร่อยู่ หากต้องการเปลี่ยนคำถามหรือลำดับ ให้กด “ซ่อนชุดข้อสอบ” ก่อน
            </div>
          ) : null}
          {builderError && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{builderError}</div>}
          {builderMessage && <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">{builderMessage}</div>}

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <div className="text-xl font-black text-gray-900">{assigned.length}/{selectedSet.question_count}</div>
              <div className="text-[11px] text-gray-500">จำนวนข้อ</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <div className="text-xl font-black text-gray-900">{totalAssignedPoints}</div>
              <div className="text-[11px] text-gray-500">คะแนนที่จัด / {selectedSet.max_score}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <div className="text-xl font-black text-gray-900">{structureLocked ? "ล็อก" : "แก้ไขได้"}</div>
              <div className="text-[11px] text-gray-500">สถานะชุดข้อสอบ</div>
            </div>
          </div>

          <section className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="font-extrabold text-gray-900 text-sm">คำถามในชุด ({assigned.length})</h4>
              <span className="text-xs text-gray-500">จัดลำดับและคะแนนรายข้อได้ก่อนมีผู้เข้าสอบ</span>
            </div>

            {assignmentsLoading ? (
              <p className="text-sm text-gray-400 py-6 text-center">กำลังโหลดรายการคำถาม...</p>
            ) : assigned.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">ยังไม่มีคำถามในชุดนี้ เพิ่มจากคลังด้านล่าง</p>
            ) : (
              <div className="flex flex-col gap-2">
                {assigned.map((row, index) => (
                  <div key={row.mappingId} className="flex items-start gap-2 border border-gray-100 rounded-xl p-3">
                    <span className="w-7 h-7 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">{row.position}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 font-medium whitespace-pre-wrap">{row.text}</div>
                      <div className="text-[11px] text-gray-400 mt-1">
                        {subcategories.find((subcategory) => subcategory.id === row.subcategory_id)?.name ?? row.subcategory_id}
                        {" · "}{row.source_round}{" · "}ระดับ {row.difficulty}
                      </div>
                    </div>
                    <label className="flex flex-col gap-1 text-[10px] text-gray-500 shrink-0">
                      คะแนน
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={row.points}
                        disabled={structureLocked || busyQuestionId === row.mappingId}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          setAssigned((previous) => previous.map((item) =>
                            item.mappingId === row.mappingId ? { ...item, points: value } : item
                          ));
                        }}
                        onBlur={(event) => void updatePoints(row, Number(event.target.value))}
                        className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-xs text-gray-900 disabled:bg-gray-100"
                      />
                    </label>
                    <div className="flex flex-col gap-1">
                      <button type="button" title="เลื่อนขึ้น" aria-label="เลื่อนคำถามขึ้น" disabled={structureLocked || index === 0 || busyQuestionId !== null} onClick={() => void moveAssignedQuestion(index, -1)} className="px-2 py-1 rounded bg-gray-100 text-xs disabled:opacity-30">↑</button>
                      <button type="button" title="เลื่อนลง" aria-label="เลื่อนคำถามลง" disabled={structureLocked || index === assigned.length - 1 || busyQuestionId !== null} onClick={() => void moveAssignedQuestion(index, 1)} className="px-2 py-1 rounded bg-gray-100 text-xs disabled:opacity-30">↓</button>
                      <button type="button" title="นำออกจากชุด" aria-label="นำคำถามออกจากชุด" disabled={structureLocked || busyQuestionId !== null} onClick={() => void removeAssignedQuestion(row)} className="px-2 py-1 rounded bg-red-50 text-red-600 text-xs disabled:opacity-30">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
            <div>
              <h4 className="font-extrabold text-gray-900 text-sm">เพิ่มคำถามจากคลัง</h4>
              <p className="text-xs text-gray-500 mt-1">เลือกคำถามที่ยังไม่อยู่ในชุดนี้ แล้วเพิ่มตามลำดับที่เลือก</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-2">
              <input
                value={questionSearch}
                onChange={(event) => setQuestionSearch(event.target.value)}
                placeholder="ค้นหาจากข้อความคำถาม..."
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                disabled={structureLocked}
              />
              <select
                value={questionFilter}
                onChange={(event) => setQuestionFilter(event.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                disabled={structureLocked}
              >
                <option value="ALL">ทุกหมวดวิชา</option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                ))}
              </select>
            </div>

            {structureLocked ? (
              <p className="text-xs text-gray-400 py-4 text-center">
                {hasAttempts ? "ไม่สามารถเปลี่ยนชุดคำถามหลังมีผู้เริ่มสอบแล้ว" : "กรุณาซ่อนชุดข้อสอบก่อนเปลี่ยนชุดคำถาม"}
              </p>
            ) : questionsLoading ? (
              <p className="text-sm text-gray-400 py-6 text-center">กำลังค้นหาคลังข้อสอบ...</p>
            ) : availableNotAssigned.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">ไม่พบคำถามที่ยังไม่ได้เพิ่มในชุดนี้</p>
            ) : (
              <>
                <div className="max-h-[420px] overflow-y-auto flex flex-col gap-1.5">
                  {availableNotAssigned.map((question) => {
                    const checked = selectedQuestionIds.includes(question.id);
                    return (
                      <label key={question.id} className={`flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer ${checked ? "border-indigo-300 bg-indigo-50" : "border-gray-100 hover:bg-gray-50"}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => setSelectedQuestionIds((previous) =>
                            event.target.checked
                              ? [...previous, question.id]
                              : previous.filter((id) => id !== question.id)
                          )}
                          className="mt-1"
                        />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm text-gray-800">{question.text}</span>
                          <span className="block text-[11px] text-gray-400 mt-1">
                            {subcategories.find((subcategory) => subcategory.id === question.subcategory_id)?.name ?? question.subcategory_id}
                            {" · "}{question.source_round}{" · "}ระดับ {question.difficulty}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap border-t border-gray-100 pt-3">
                  <span className="text-xs text-gray-500">เลือกแล้ว {selectedQuestionIds.length} ข้อ · เพิ่มได้อีก {Math.max(selectedSet.question_count - assigned.length, 0)} ข้อ</span>
                  <button
                    type="button"
                    disabled={saving || structureLocked || selectedQuestionIds.length === 0}
                    onClick={() => void addSelectedQuestions()}
                    className="px-4 py-2 bg-indigo rounded-lg text-white text-xs font-bold disabled:opacity-40"
                  >
                    {saving ? "กำลังเพิ่ม..." : "เพิ่มคำถามที่เลือก"}
                  </button>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
