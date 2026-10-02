"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (insertError) {
      setError(insertError.message);
      return;
    }
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
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
