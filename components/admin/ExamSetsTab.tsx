"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

<<<<<<< HEAD
type ExamSetRow = {
  id: string;
  slug: string | null;
  name: string;
  mode: string;
  question_count: number;
  max_score: number;
  pass_score: number;
  time_limit_minutes: number;
  is_published: boolean;
};

const EMPTY_FORM = {
  slug: "",
  name: "",
  mode: "archive",
  question_count: 25,
  max_score: 50,
  pass_score: 30,
  time_limit_minutes: 60,
};

export default function ExamSetsTab() {
  const supabase = createClient();
  const [sets, setSets] = useState<ExamSetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("exam_sets").select("*").order("created_at", { ascending: false });
    setSets((data as ExamSetRow[]) ?? []);
=======
type Category = { id: string; name: string; sort_order: number; is_active: boolean };
type ExamYear = { id: string; label: string; year: number; is_active: boolean };

export default function ExamSetsTab() {
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [examYears, setExamYears] = useState<ExamYear[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newYearLabel, setNewYearLabel] = useState("");
  const [newYearNum, setNewYearNum] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: cats }, { data: years }] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("exam_years").select("*").order("year", { ascending: false }),
    ]);
    setCategories((cats as Category[]) ?? []);
    setExamYears((years as ExamYear[]) ?? []);
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

<<<<<<< HEAD
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name) {
      setError("กรุณากรอกชื่อชุดข้อสอบ");
      return;
    }
    setSaving(true);
    const { error: insertError } = await supabase.from("exam_sets").insert({
      slug: form.slug || null,
      name: form.name,
      mode: form.mode,
      question_count: form.question_count,
      max_score: form.max_score,
      pass_score: form.pass_score,
      time_limit_minutes: form.time_limit_minutes,
      is_published: true,
    });
    setSaving(false);
=======
  const addCategory = async () => {
    setError(null);
    if (!newCategory.trim()) return;
    const { error: insertError } = await supabase
      .from("categories")
      .insert({ name: newCategory.trim(), sort_order: categories.length, is_active: true });
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
    if (insertError) {
      setError(insertError.message);
      return;
    }
<<<<<<< HEAD
    setForm(EMPTY_FORM);
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("ลบชุดข้อสอบนี้? (จะลบการ mapping คำถามในชุดนี้ด้วย)")) return;
    await supabase.from("exam_set_questions").delete().eq("exam_set_id", id);
    await supabase.from("exam_sets").delete().eq("id", id);
    setSets((prev) => prev.filter((s) => s.id !== id));
  };

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from("exam_sets").update({ is_published: !current }).eq("id", id);
    setSets((prev) => prev.map((s) => (s.id === id ? { ...s, is_published: !current } : s)));
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => setShowForm((v) => !v)}
        className="self-start px-4 py-2 bg-indigo rounded-lg text-white text-sm font-bold"
      >
        {showForm ? "ยกเลิก" : "+ สร้างชุดข้อสอบใหม่"}
      </button>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="ชื่อชุดข้อสอบ"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="Slug (เช่น SIM004) — ไม่บังคับ"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <select
              value={form.mode}
              onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="archive">คลังข้อสอบเก่า (archive)</option>
              <option value="simulation">จำลองสนามสอบ (simulation)</option>
              <option value="practice">ฝึกพร้อมเฉลย (practice)</option>
              <option value="workshop">แบบฝึกหัดกำหนดเอง (workshop)</option>
              <option value="category">ติวเจาะรายหมวด (category)</option>
            </select>
            <input
              type="number"
              value={form.time_limit_minutes}
              onChange={(e) => setForm((f) => ({ ...f, time_limit_minutes: Number(e.target.value) }))}
              placeholder="เวลา (นาที, 0 = ไม่จำกัด)"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <input
              type="number"
              value={form.question_count}
              onChange={(e) => setForm((f) => ({ ...f, question_count: Number(e.target.value) }))}
              placeholder="จำนวนข้อ"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <input
              type="number"
              value={form.max_score}
              onChange={(e) => setForm((f) => ({ ...f, max_score: Number(e.target.value) }))}
              placeholder="คะแนนเต็ม"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <input
              type="number"
              value={form.pass_score}
              onChange={(e) => setForm((f) => ({ ...f, pass_score: Number(e.target.value) }))}
              placeholder="เกณฑ์ผ่าน (คะแนน)"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="self-start px-5 py-2 bg-green-600 rounded-lg text-white text-sm font-bold disabled:opacity-60"
          >
            {saving ? "กำลังสร้าง..." : "💾 สร้างชุดข้อสอบ"}
          </button>
          <p className="text-xs text-gray-400">
            หมายเหตุ: หลังสร้างชุดแล้ว ต้องเพิ่มคำถามเข้าชุดผ่านตาราง exam_set_questions
            (ยังไม่มี UI จัดลำดับคำถามในสแคฟโฟลด์นี้ — ต่อยอดได้ในเวอร์ชันถัดไป)
          </p>
        </form>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 py-10 text-center">กำลังโหลด...</div>
      ) : (
        <div className="flex flex-col gap-2">
          {sets.map((s) => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="font-bold text-gray-900 text-sm">{s.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {s.slug ?? "—"} · {s.mode} · {s.question_count} ข้อ · {s.max_score} คะแนน
                </div>
              </div>
              <button
                onClick={() => togglePublish(s.id, s.is_published)}
                className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  s.is_published ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {s.is_published ? "เผยแพร่อยู่" : "ซ่อนอยู่"}
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                className="px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs font-semibold"
              >
                ลบ
=======
    setNewCategory("");
    load();
  };

  const addExamYear = async () => {
    setError(null);
    if (!newYearLabel.trim() || !newYearNum) return;
    const { error: insertError } = await supabase
      .from("exam_years")
      .insert({ label: newYearLabel.trim(), year: Number(newYearNum), is_active: true });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNewYearLabel("");
    setNewYearNum("");
    load();
  };

  const toggleCategory = async (id: string, current: boolean) => {
    await supabase.from("categories").update({ is_active: !current }).eq("id", id);
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: !current } : c)));
  };

  const toggleYear = async (id: string, current: boolean) => {
    await supabase.from("exam_years").update({ is_active: !current }).eq("id", id);
    setExamYears((prev) => prev.map((y) => (y.id === id ? { ...y, is_active: !current } : y)));
  };

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">กำลังโหลด...</div>;

  return (
    <div className="flex flex-col gap-5">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="font-extrabold text-gray-900 text-sm mb-3.5">🎯 หมวดวิชา (ใช้ในโหมดติวเจาะรายหมวด)</div>
        <div className="flex gap-2 mb-4">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="ชื่อหมวดวิชาใหม่"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <button onClick={addCategory} className="px-4 py-2 bg-indigo rounded-lg text-white text-sm font-bold">
            + เพิ่ม
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50 rounded-lg">
              <span className="text-sm font-semibold text-gray-700">{c.name}</span>
              <button
                onClick={() => toggleCategory(c.id, c.is_active)}
                className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  c.is_active ? "bg-green-50 text-green-700" : "bg-gray-200 text-gray-500"
                }`}
              >
                {c.is_active ? "ใช้งานอยู่" : "ปิดใช้งาน"}
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
              </button>
            </div>
          ))}
        </div>
<<<<<<< HEAD
      )}
=======
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="font-extrabold text-gray-900 text-sm mb-3.5">📚 รอบ/ปีสอบ (ใช้ในโหมดคลังข้อสอบเก่า)</div>
        <div className="flex gap-2 mb-4 flex-wrap">
          <input
            value={newYearLabel}
            onChange={(e) => setNewYearLabel(e.target.value)}
            placeholder="ชื่อรอบสอบ เช่น ก.พ. PAPER 2570"
            className="flex-1 min-w-[180px] px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <input
            value={newYearNum}
            onChange={(e) => setNewYearNum(e.target.value)}
            placeholder="พ.ศ."
            type="number"
            className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <button onClick={addExamYear} className="px-4 py-2 bg-indigo rounded-lg text-white text-sm font-bold">
            + เพิ่ม
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {examYears.map((y) => (
            <div key={y.id} className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50 rounded-lg">
              <span className="text-sm font-semibold text-gray-700">{y.label} <span className="text-gray-400 font-normal">(พ.ศ. {y.year})</span></span>
              <button
                onClick={() => toggleYear(y.id, y.is_active)}
                className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  y.is_active ? "bg-green-50 text-green-700" : "bg-gray-200 text-gray-500"
                }`}
              >
                {y.is_active ? "ใช้งานอยู่" : "ปิดใช้งาน"}
              </button>
            </div>
          ))}
        </div>
      </div>
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
    </div>
  );
}
