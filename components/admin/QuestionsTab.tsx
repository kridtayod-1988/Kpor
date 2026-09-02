"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

<<<<<<< HEAD
type Subcategory = { id: string; name: string; group_id: string };
type QuestionRow = {
  id: string;
  subcategory_id: string;
  text: string;
  choices: string[];
  correct_index: number;
  explanation: string;
  source_round: string;
};

const EMPTY_FORM = {
  subcategory_id: "",
  text: "",
=======
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
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
  choice_0: "",
  choice_1: "",
  choice_2: "",
  choice_3: "",
<<<<<<< HEAD
  correct_index: 0,
=======
  correct_answer_index: 0,
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
  explanation: "",
};

export default function QuestionsTab() {
  const supabase = createClient();
<<<<<<< HEAD
  const [subcats, setSubcats] = useState<Subcategory[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterSub, setFilterSub] = useState("ALL");
=======
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("ALL");
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuestions = async () => {
    setLoading(true);
    let query = supabase.from("questions").select("*").order("created_at", { ascending: false }).limit(200);
<<<<<<< HEAD
    if (filterSub !== "ALL") query = query.eq("subcategory_id", filterSub);
    if (search.trim()) query = query.ilike("text", `%${search.trim()}%`);
=======
    if (filterCat !== "ALL") query = query.eq("category_id", filterCat);
    if (search.trim()) query = query.ilike("question_text", `%${search.trim()}%`);
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
    const { data } = await query;
    setQuestions((data as QuestionRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
<<<<<<< HEAD
    supabase
      .from("subcategories")
      .select("id, name, group_id")
      .order("sort_order")
      .then(({ data }) => setSubcats((data as Subcategory[]) ?? []));
=======
    supabase.from("categories").select("id, name").order("sort_order").then(({ data }) => setCategories((data as Category[]) ?? []));
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
<<<<<<< HEAD
  }, [filterSub]);
=======
  }, [filterCat]);
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc

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
<<<<<<< HEAD
    const choices = [form.choice_0, form.choice_1, form.choice_2, form.choice_3];
    if (!form.subcategory_id || !form.text || choices.some((c) => !c) || !form.explanation) {
=======
    const options = [form.choice_0, form.choice_1, form.choice_2, form.choice_3];
    if (!form.category_id || !form.question_text || options.some((c) => !c) || !form.explanation) {
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
      setError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    setSaving(true);
    const { error: insertError } = await supabase.from("questions").insert({
<<<<<<< HEAD
      subcategory_id: form.subcategory_id,
      text: form.text,
      choices,
      correct_index: form.correct_index,
      explanation: form.explanation,
      source_round: "manual",
=======
      category_id: form.category_id,
      question_text: form.question_text,
      options,
      correct_answer_index: form.correct_answer_index,
      explanation: form.explanation,
      source: "manual",
      is_active: true,
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
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
<<<<<<< HEAD
          value={filterSub}
          onChange={(e) => setFilterSub(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="ALL">ทุกหมวดวิชา</option>
          {subcats.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
=======
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="ALL">ทุกหมวดวิชา</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
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
<<<<<<< HEAD
            value={form.subcategory_id}
            onChange={(e) => setForm((f) => ({ ...f, subcategory_id: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">— เลือกหมวดวิชา —</option>
            {subcats.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <textarea
            value={form.text}
            onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
=======
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
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
            placeholder="โจทย์คำถาม"
            rows={2}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <label key={i} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
<<<<<<< HEAD
                  checked={form.correct_index === i}
                  onChange={() => setForm((f) => ({ ...f, correct_index: i }))}
=======
                  checked={form.correct_answer_index === i}
                  onChange={() => setForm((f) => ({ ...f, correct_answer_index: i }))}
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
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
<<<<<<< HEAD
                  {subcats.find((s) => s.id === q.subcategory_id)?.name ?? q.subcategory_id} · {q.source_round}
                </div>
                <div className="text-sm text-gray-900 font-medium truncate">{q.text}</div>
=======
                  {categories.find((c) => c.id === q.category_id)?.name ?? q.category_id} · {q.source}
                </div>
                <div className="text-sm text-gray-900 font-medium truncate">{q.question_text}</div>
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
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
