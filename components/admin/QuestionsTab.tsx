"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Category = { id: string; name: string };
type QuestionRow = {
  id: string;
  category_id: string;
  question_text: string;
  options: string[];
  correct_answer_index: number;
  explanation: string;
  source: string;
};

const EMPTY_FORM = {
  category_id: "",
  question_text: "",
  choice_0: "",
  choice_1: "",
  choice_2: "",
  choice_3: "",
  correct_answer_index: 0,
  explanation: "",
};

export default function QuestionsTab() {
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuestions = async () => {
    setLoading(true);
    let query = supabase.from("questions").select("*").order("created_at", { ascending: false }).limit(200);
    if (filterCat !== "ALL") query = query.eq("category_id", filterCat);
    if (search.trim()) query = query.ilike("question_text", `%${search.trim()}%`);
    const { data } = await query;
    setQuestions((data as QuestionRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    supabase.from("categories").select("id, name").order("sort_order").then(({ data }) => setCategories((data as Category[]) ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCat]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadQuestions();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("ลบข้อสอบข้อนี้ออกจากคลัง?")) return;
    await supabase.from("questions").delete().eq("id", id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const options = [form.choice_0, form.choice_1, form.choice_2, form.choice_3];
    if (!form.category_id || !form.question_text || options.some((c) => !c) || !form.explanation) {
      setError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    setSaving(true);
    const { error: insertError } = await supabase.from("questions").insert({
      category_id: form.category_id,
      question_text: form.question_text,
      options,
      correct_answer_index: form.correct_answer_index,
      explanation: form.explanation,
      source: "manual",
      is_active: true,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setForm(EMPTY_FORM);
    setShowForm(false);
    loadQuestions();
  };

  return (
    <div className="flex flex-col gap-4">
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
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="ALL">ทุกหมวดวิชา</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-indigo rounded-lg text-white text-sm font-bold"
        >
          {showForm ? "ยกเลิก" : "+ เพิ่มข้อสอบ"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3">
          <select
            value={form.category_id}
            onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">— เลือกหมวดวิชา —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <textarea
            value={form.question_text}
            onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))}
            placeholder="โจทย์คำถาม"
            rows={2}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <label key={i} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={form.correct_answer_index === i}
                  onChange={() => setForm((f) => ({ ...f, correct_answer_index: i }))}
                />
                <input
                  value={(form as any)[`choice_${i}`]}
                  onChange={(e) => setForm((f) => ({ ...f, [`choice_${i}`]: e.target.value }))}
                  placeholder={`ตัวเลือก ${["ก", "ข", "ค", "ง"][i]}`}
                  className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm"
                />
              </label>
            ))}
          </div>
          <textarea
            value={form.explanation}
            onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
            placeholder="คำอธิบายเฉลยแบบ step-by-step"
            rows={2}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="self-start px-5 py-2 bg-green-600 rounded-lg text-white text-sm font-bold disabled:opacity-60"
          >
            {saving ? "กำลังบันทึก..." : "💾 บันทึกข้อสอบ"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 py-10 text-center">กำลังโหลด...</div>
      ) : (
        <div className="flex flex-col gap-2">
          {questions.map((q) => (
            <div key={q.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-400 mb-1">
                  {categories.find((c) => c.id === q.category_id)?.name ?? q.category_id} · {q.source}
                </div>
                <div className="text-sm text-gray-900 font-medium truncate">{q.question_text}</div>
              </div>
              <button
                onClick={() => handleDelete(q.id)}
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
