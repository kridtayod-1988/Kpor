"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Subcategory = { id: string; name: string; group_id: string };
type QuestionRow = {
  id: string;
  subcategory_id: string;
  text: string;
  choices: string[];
  correct_index: number | null;
  explanation: string;
  source_round: string;
  is_active: boolean;
};

type QuestionForm = {
  subcategory_id: string;
  text: string;
  choice_0: string;
  choice_1: string;
  choice_2: string;
  choice_3: string;
  correct_index: number;
  explanation: string;
  is_active: boolean;
};

const EMPTY_FORM: QuestionForm = {
  subcategory_id: "",
  text: "",
  choice_0: "",
  choice_1: "",
  choice_2: "",
  choice_3: "",
  correct_index: 0,
  explanation: "",
  is_active: true,
};

export default function QuestionsTab() {
  const supabase = createClient();
  const [subcats, setSubcats] = useState<Subcategory[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [reviewStats, setReviewStats] = useState({ pending: 0, missingExplanation: 0, active: 0 });
  const [search, setSearch] = useState("");
  const [filterSub, setFilterSub] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("questions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filterSub !== "ALL") query = query.eq("subcategory_id", filterSub);
      if (statusFilter !== "ALL") query = query.eq("is_active", statusFilter === "ACTIVE");
      if (search.trim()) query = query.ilike("text", `%${search.trim()}%`);

      const { data, error: loadError } = await query;
      if (loadError) throw loadError;

      // Keep the overview independent of the status filter so admins can see
      // the full review workload even while viewing only one status.
      const countQuery = () => {
        let count = supabase.from("questions").select("id", { count: "exact", head: true });
        if (filterSub !== "ALL") count = count.eq("subcategory_id", filterSub);
        if (search.trim()) count = count.ilike("text", `%${search.trim()}%`);
        return count;
      };
      const [pendingResult, missingResult, activeResult] = await Promise.all([
        countQuery().eq("is_active", false),
        countQuery().eq("is_active", false).ilike("explanation", "%ยังไม่มีคำอธิบาย%"),
        countQuery().eq("is_active", true),
      ]);
      const countError = pendingResult.error ?? missingResult.error ?? activeResult.error;
      if (countError) throw countError;

      setQuestions((data as QuestionRow[]) ?? []);
      setReviewStats({
        pending: pendingResult.count ?? 0,
        missingExplanation: missingResult.count ?? 0,
        active: activeResult.count ?? 0,
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดคลังข้อสอบไม่สำเร็จ");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadSubcategories = async () => {
      const { data, error: subcategoryError } = await supabase
        .from("subcategories")
        .select("id, name, group_id")
        .order("sort_order");
      if (!cancelled) {
        if (subcategoryError) {
          setError(subcategoryError.message);
        } else {
          setSubcats((data as Subcategory[]) ?? []);
        }
      }
    };

    void loadSubcategories();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSub, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void loadQuestions();
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  const handleEdit = async (question: QuestionRow) => {
    setError(null);

    // Editing a question already used in an attempt would rewrite historical
    // review content. The database trigger in migration 05 enforces this too.
    const { data: mappings, error: mappingError } = await supabase
      .from("exam_set_questions")
      .select("exam_set_id")
      .eq("question_id", question.id);

    if (mappingError) {
      setError(mappingError.message);
      return;
    }

    const examSetIds = [...new Set((mappings ?? []).map((mapping) => mapping.exam_set_id))];
    if (examSetIds.length > 0) {
      const { data: attempts, error: attemptError } = await supabase
        .from("user_attempts")
        .select("id")
        .in("exam_set_id", examSetIds)
        .limit(1);

      if (attemptError) {
        setError(attemptError.message);
        return;
      }
      if (attempts && attempts.length > 0) {
        setError("ข้อสอบนี้ถูกใช้ในประวัติการสอบแล้ว เพื่อรักษาผลย้อนหลัง กรุณาสร้างข้อสอบใหม่แทน");
        return;
      }
    }

    const choices = question.choices ?? [];
    setForm({
      subcategory_id: question.subcategory_id,
      text: question.text,
      choice_0: choices[0] ?? "",
      choice_1: choices[1] ?? "",
      choice_2: choices[2] ?? "",
      choice_3: choices[3] ?? "",
      correct_index: question.correct_index ?? 0,
      explanation: question.explanation ?? "",
      is_active: question.is_active,
    });
    setEditingId(question.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("ยืนยันลบข้อสอบข้อนี้ออกจากคลัง?")) return;
    setError(null);
    const { error: deleteError } = await supabase.from("questions").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setQuestions((prev) => prev.filter((question) => question.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const choices = [form.choice_0, form.choice_1, form.choice_2, form.choice_3].map((value) => value.trim());
    if (!form.subcategory_id || !form.text.trim() || choices.some((choice) => !choice) || !form.explanation.trim()) {
      setError("กรุณากรอกหมวดวิชา โจทย์ ตัวเลือกทั้ง 4 ข้อ และคำอธิบายเฉลยให้ครบ");
      return;
    }
    if (form.is_active && form.explanation.includes("ยังไม่มีคำอธิบาย")) {
      setError("ยังเปิดใช้ข้อสอบไม่ได้ กรุณาเขียนคำอธิบายเฉลยใหม่ก่อน");
      return;
    }

    setSaving(true);
    const payload = {
      subcategory_id: form.subcategory_id,
      text: form.text.trim(),
      choices,
      correct_index: form.correct_index,
      explanation: form.explanation.trim(),
      is_active: form.is_active,
    };

    const result = editingId
      ? await supabase.from("questions").update(payload).eq("id", editingId)
      : await supabase.from("questions").insert({ ...payload, source_round: "manual" });

    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    resetForm();
    await loadQuestions();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-xs text-amber-700">รอตรวจทั้งหมด</div>
          <div className="text-2xl font-bold text-amber-900">{reviewStats.pending}</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="text-xs text-red-700">ยังไม่มีคำอธิบายเฉลย</div>
          <div className="text-2xl font-bold text-red-900">{reviewStats.missingExplanation}</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <div className="text-xs text-green-700">เปิดใช้งานแล้ว</div>
          <div className="text-2xl font-bold text-green-900">{reviewStats.active}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5 items-center">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาข้อความคำถาม..."
            className="flex-1 px-3.5 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo"
          />
          <button type="submit" className="px-3.5 py-2 bg-gray-100 rounded-lg text-sm font-semibold text-gray-600">
            ค้นหา
          </button>
        </form>
        <select
          value={filterSub}
          onChange={(e) => setFilterSub(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="ALL">ทุกหมวดวิชา</option>
          {subcats.map((subcategory) => (
            <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          aria-label="กรองสถานะข้อสอบ"
        >
          <option value="ALL">ทุกสถานะ</option>
          <option value="INACTIVE">รอตรวจ / ยังไม่เปิดใช้</option>
          <option value="ACTIVE">เปิดใช้งานแล้ว</option>
        </select>
        <button
          type="button"
          onClick={() => {
            if (showForm) resetForm();
            else {
              setEditingId(null);
              setForm(EMPTY_FORM);
              setError(null);
              setShowForm(true);
            }
          }}
          className="px-4 py-2 bg-indigo rounded-lg text-white text-sm font-bold"
        >
          {showForm ? "ยกเลิก" : "+ เพิ่มข้อสอบ"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3">
          <div className="font-bold text-gray-900">{editingId ? "แก้ไขข้อสอบ" : "เพิ่มข้อสอบใหม่"}</div>
          <select
            value={form.subcategory_id}
            onChange={(e) => setForm((current) => ({ ...current, subcategory_id: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            required
          >
            <option value="">— เลือกหมวดวิชา —</option>
            {subcats.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
            ))}
          </select>
          <textarea
            value={form.text}
            onChange={(e) => setForm((current) => ({ ...current, text: e.target.value }))}
            placeholder="โจทย์คำถาม"
            rows={3}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {([0, 1, 2, 3] as const).map((index) => {
              const field = (`choice_${index}`) as "choice_0" | "choice_1" | "choice_2" | "choice_3";
              return (
                <label key={index} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="correct-answer"
                    aria-label={`กำหนดตัวเลือก ${["ก", "ข", "ค", "ง"][index]} เป็นคำตอบที่ถูกต้อง`}
                    checked={form.correct_index === index}
                    onChange={() => setForm((current) => ({ ...current, correct_index: index }))}
                  />
                  <input
                    value={form[field]}
                    onChange={(e) => setForm((current) => ({ ...current, [field]: e.target.value }))}
                    placeholder={`ตัวเลือก ${["ก", "ข", "ค", "ง"][index]}`}
                    className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm"
                    required
                  />
                </label>
              );
            })}
          </div>
          <textarea
            value={form.explanation}
            onChange={(e) => setForm((current) => ({ ...current, explanation: e.target.value }))}
            placeholder="คำอธิบายเฉลยแบบ step-by-step"
            rows={3}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            required
          />
          <label className="flex items-start gap-2 rounded-lg border border-gray-200 p-3 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((current) => ({ ...current, is_active: e.target.checked }))}
              className="mt-0.5"
            />
            <span>
              <span className="block font-semibold text-gray-800">เปิดใช้ข้อสอบ</span>
              <span className="block text-xs text-gray-500 mt-0.5">
                เปิดใช้ได้เมื่อโจทย์ ตัวเลือก คำตอบ และคำอธิบายเฉลยผ่านการตรวจแล้วเท่านั้น
              </span>
            </span>
          </label>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-green-600 rounded-lg text-white text-sm font-bold disabled:opacity-60"
            >
              {saving ? "กำลังบันทึก..." : editingId ? "💾 บันทึกการแก้ไข" : "💾 บันทึกข้อสอบ"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 text-sm font-semibold disabled:opacity-60"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      {error && !showForm && <p className="text-xs text-red-600">{error}</p>}

      {!loading && reviewStats.pending > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          แนวทางตรวจข้อสอบ: เปิดข้อที่รอตรวจทีละข้อ ตรวจโจทย์ ตัวเลือก และตำแหน่งคำตอบให้ตรงต้นฉบับ จากนั้นเขียนคำอธิบายเฉลยด้วยเหตุผลที่ตรวจสอบได้ แล้วจึงเลือก “เปิดใช้ข้อสอบ”
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 py-10 text-center">กำลังโหลด...</div>
      ) : (
        <div className="flex flex-col gap-2">
          {questions.map((question) => (
            <div key={question.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-xs text-gray-400 mb-1">
                  <span>
                    {subcats.find((subcategory) => subcategory.id === question.subcategory_id)?.name ?? question.subcategory_id}
                    {" · "}{question.source_round}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${question.is_active ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                    {question.is_active ? "เปิดใช้" : "รอตรวจ"}
                  </span>
                </div>
                <div className="text-sm text-gray-900 font-medium">{question.text}</div>
              </div>
              <button
                type="button"
                onClick={() => void handleEdit(question)}
                className="shrink-0 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 text-xs font-semibold"
              >
                แก้ไข
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(question.id)}
                className="shrink-0 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs font-semibold"
              >
                ลบ
              </button>
            </div>
          ))}
          {questions.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">ไม่พบข้อสอบที่ตรงกับเงื่อนไข</div>
          )}
        </div>
      )}
    </div>
  );
}
