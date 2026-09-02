"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

<<<<<<< HEAD
type Subcategory = { id: string; name: string; group_id: string };
type GeneratedQuestion = { text: string; choices: string[]; correct_index: number; explanation: string };
=======
type Category = { id: string; name: string };
type GeneratedQuestion = { question_text: string; options: string[]; correct_answer_index: number; explanation: string };
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc

const SOURCE_MODES = [
  { key: "article", label: "📄 บทความ" },
  { key: "topic", label: "💡 หัวข้อ" },
  { key: "google_sheet", label: "📊 Google Sheet" },
];

export default function AIGeneratorTab() {
  const supabase = createClient();
<<<<<<< HEAD
  const [subcats, setSubcats] = useState<Subcategory[]>([]);
  const [subcategoryId, setSubcategoryId] = useState("");
=======
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
  const [sourceMode, setSourceMode] = useState("topic");
  const [sourceInput, setSourceInput] = useState("");
  const [provider, setProvider] = useState<"auto" | "gemini" | "claude">("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<GeneratedQuestion[] | null>(null);
  const [logId, setLogId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
<<<<<<< HEAD
    supabase
      .from("subcategories")
      .select("id, name, group_id")
      .order("sort_order")
      .then(({ data }) => setSubcats((data as Subcategory[]) ?? []));
=======
    supabase.from("categories").select("id, name").eq("is_active", true).order("sort_order").then(({ data }) => setCategories((data as Category[]) ?? []));
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    setError(null);
    setSavedMsg(null);
    setPreview(null);
<<<<<<< HEAD
    if (!subcategoryId || !sourceInput.trim()) {
=======
    if (!categoryId || !sourceInput.trim()) {
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
      setError("กรุณาเลือกหมวดวิชาและกรอกเนื้อหา/หัวข้อ");
      return;
    }
    setLoading(true);
<<<<<<< HEAD
    const subcategoryName = subcats.find((s) => s.id === subcategoryId)?.name ?? subcategoryId;
=======
    const categoryName = categories.find((c) => c.id === categoryId)?.name ?? categoryId;
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
    try {
      const res = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
<<<<<<< HEAD
        body: JSON.stringify({ subcategoryId, subcategoryName, sourceMode, sourceInput, provider }),
=======
        body: JSON.stringify({ categoryId, categoryName, sourceMode, sourceInput, provider }),
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "เกิดข้อผิดพลาด");
      setPreview(json.questions);
      setLogId(json.logId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preview || !logId) return;
    setSaving(true);
    const rows = preview.map((q) => ({
<<<<<<< HEAD
      subcategory_id: subcategoryId,
      text: q.text,
      choices: q.choices,
      correct_index: q.correct_index,
      explanation: q.explanation,
      source_round: "ai_generated" as const,
      ai_generation_log_id: logId,
=======
      category_id: categoryId,
      question_text: q.question_text,
      options: q.options,
      correct_answer_index: q.correct_answer_index,
      explanation: q.explanation,
      source: "ai_generated" as const,
      ai_generation_log_id: logId,
      is_active: true,
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
    }));
    const { error: insertError } = await supabase.from("questions").insert(rows);
    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }
<<<<<<< HEAD
    await supabase
      .from("ai_generation_logs")
      .update({ status: "saved", reviewed_at: new Date().toISOString() })
      .eq("id", logId);
=======
    await supabase.from("ai_generation_logs").update({ status: "saved", reviewed_at: new Date().toISOString() }).eq("id", logId);
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
    setSaving(false);
    setSavedMsg(`✅ บันทึกข้อสอบ ${rows.length} ข้อลงคลังเรียบร้อย`);
    setPreview(null);
  };

  const handleDiscard = async () => {
    if (logId) {
<<<<<<< HEAD
      await supabase
        .from("ai_generation_logs")
        .update({ status: "discarded", reviewed_at: new Date().toISOString() })
        .eq("id", logId);
=======
      await supabase.from("ai_generation_logs").update({ status: "discarded", reviewed_at: new Date().toISOString() }).eq("id", logId);
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
    }
    setPreview(null);
    setLogId(null);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3.5">
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">เลือกหมวดวิชา ก.พ.</div>
<<<<<<< HEAD
          <select
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">— เลือกหมวดวิชา —</option>
            {subcats.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
=======
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">— เลือกหมวดวิชา —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Source Mode</div>
          <div className="flex gap-2">
            {SOURCE_MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setSourceMode(m.key)}
                className="px-3.5 py-1.5 rounded-full text-sm font-semibold"
<<<<<<< HEAD
                style={{
                  background: sourceMode === m.key ? "#4f46e5" : "#f3f4f6",
                  color: sourceMode === m.key ? "#fff" : "#6b7280",
                }}
=======
                style={{ background: sourceMode === m.key ? "#4f46e5" : "#f3f4f6", color: sourceMode === m.key ? "#fff" : "#6b7280" }}
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
            {sourceMode === "article" ? "วางเนื้อหาบทความ" : sourceMode === "google_sheet" ? "Google Sheet URL หรือ ID" : "หัวข้อที่ต้องการออกข้อสอบ"}
          </div>
          <textarea
            value={sourceInput}
            onChange={(e) => setSourceInput(e.target.value)}
            rows={sourceMode === "article" ? 5 : 2}
            placeholder={
              sourceMode === "article"
                ? "วางเนื้อหาบทความที่ต้องการใช้ออกข้อสอบ..."
                : sourceMode === "google_sheet"
                  ? "https://docs.google.com/spreadsheets/d/..."
                  : "เช่น พ.ร.บ.ระเบียบบริหารราชการแผ่นดิน มาตรา 7-10"
            }
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>

        <div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">AI Provider</div>
          <div className="flex gap-2">
            {(["auto", "gemini", "claude"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className="px-3.5 py-1.5 rounded-full text-sm font-semibold"
<<<<<<< HEAD
                style={{
                  background: provider === p ? "#6d28d9" : "#f3f4f6",
                  color: provider === p ? "#fff" : "#6b7280",
                }}
=======
                style={{ background: provider === p ? "#6d28d9" : "#f3f4f6", color: provider === p ? "#fff" : "#6b7280" }}
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
              >
                {p === "auto" ? "🔀 Auto" : p === "gemini" ? "✨ Gemini" : "🧠 Claude"}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
        {savedMsg && <p className="text-xs text-green-700 font-semibold">{savedMsg}</p>}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="self-start px-5 py-2.5 bg-purple rounded-xl text-white font-bold text-sm disabled:opacity-60"
        >
          {loading ? "🤖 AI กำลังสร้างข้อสอบ..." : "✨ สร้างข้อสอบด้วย AI"}
        </button>
      </div>

      {preview && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="font-extrabold text-gray-900 text-sm mb-3.5">
            👀 พื้นที่พรีวิว — ตรวจสอบก่อนบันทึกลงคลัง ({preview.length} ข้อ)
          </div>
          <div className="flex flex-col gap-3 mb-4">
            {preview.map((q, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-3.5">
<<<<<<< HEAD
                <div className="text-sm font-semibold text-gray-900 mb-2">
                  {i + 1}. {q.text}
                </div>
                <div className="flex flex-col gap-1">
                  {q.choices.map((c, ci) => (
                    <div
                      key={ci}
                      className={`text-xs px-2.5 py-1.5 rounded-lg ${
                        ci === q.correct_index ? "bg-green-50 text-green-800 font-bold" : "bg-gray-50 text-gray-600"
                      }`}
                    >
                      {["ก", "ข", "ค", "ง"][ci]}. {c} {ci === q.correct_index && "✓ เฉลย"}
=======
                <div className="text-sm font-semibold text-gray-900 mb-2">{i + 1}. {q.question_text}</div>
                <div className="flex flex-col gap-1">
                  {q.options.map((c, ci) => (
                    <div
                      key={ci}
                      className={`text-xs px-2.5 py-1.5 rounded-lg ${
                        ci === q.correct_answer_index ? "bg-green-50 text-green-800 font-bold" : "bg-gray-50 text-gray-600"
                      }`}
                    >
                      {["ก", "ข", "ค", "ง"][ci]}. {c} {ci === q.correct_answer_index && "✓ เฉลย"}
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-500 italic mt-2">📖 {q.explanation}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2.5">
<<<<<<< HEAD
            <button
              onClick={handleDiscard}
              className="px-4 py-2 bg-gray-100 rounded-lg text-gray-600 text-sm font-semibold"
            >
              🧹 ล้างรีวิว
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 rounded-lg text-white text-sm font-bold disabled:opacity-60"
            >
=======
            <button onClick={handleDiscard} className="px-4 py-2 bg-gray-100 rounded-lg text-gray-600 text-sm font-semibold">
              🧹 ล้างรีวิว
            </button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-green-600 rounded-lg text-white text-sm font-bold disabled:opacity-60">
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
              {saving ? "กำลังบันทึก..." : "💾 บันทึกลงคลัง"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
