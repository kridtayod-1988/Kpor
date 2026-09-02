"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DbTab() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
<<<<<<< HEAD
      const [{ data: questions }, { data: examSets }, { data: sections }, { data: subcats }] = await Promise.all([
        supabase.from("questions").select("*"),
        supabase.from("exam_sets").select("*"),
        supabase.from("exam_set_sections").select("*"),
        supabase.from("subcategories").select("*"),
=======
      const [{ data: questions }, { data: categories }, { data: examYears }] = await Promise.all([
        supabase.from("questions").select("*"),
        supabase.from("categories").select("*"),
        supabase.from("exam_years").select("*"),
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
      ]);

      const backup = {
        exported_at: new Date().toISOString(),
        questions,
<<<<<<< HEAD
        exam_sets: examSets,
        exam_set_sections: sections,
        subcategories: subcats,
=======
        categories,
        exam_years: examYears,
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kpor-exam-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
<<<<<<< HEAD
      setMsg("✅ ส่งออกไฟล์สำรองข้อมูลเรียบร้อย");

      await supabase.from("admin_audit_log").insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: "export_json",
        details: { question_count: questions?.length ?? 0 },
      });
=======
      setMsg(`✅ ส่งออกไฟล์สำรองข้อมูลเรียบร้อย (${questions?.length ?? 0} ข้อสอบ)`);
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาดระหว่างส่งออก");
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

<<<<<<< HEAD
      if (parsed.subcategories?.length) {
        await supabase.from("subcategories").upsert(parsed.subcategories);
      }
      if (parsed.questions?.length) {
        await supabase.from("questions").upsert(parsed.questions);
      }
      if (parsed.exam_sets?.length) {
        await supabase.from("exam_sets").upsert(parsed.exam_sets);
      }
      if (parsed.exam_set_sections?.length) {
        await supabase.from("exam_set_sections").upsert(parsed.exam_set_sections);
      }

      await supabase.from("admin_audit_log").insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: "import_json",
        details: { question_count: parsed.questions?.length ?? 0 },
      });
=======
      if (parsed.categories?.length) await supabase.from("categories").upsert(parsed.categories);
      if (parsed.exam_years?.length) await supabase.from("exam_years").upsert(parsed.exam_years);
      if (parsed.questions?.length) await supabase.from("questions").upsert(parsed.questions);
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc

      setMsg(`✅ นำเข้าข้อมูลเรียบร้อย (${parsed.questions?.length ?? 0} ข้อสอบ)`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ไฟล์ไม่ถูกต้อง หรือนำเข้าไม่สำเร็จ");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleReset = async () => {
<<<<<<< HEAD
    const confirm1 = window.confirm("⚠️ ต้องการลบคำถามทั้งหมดในคลังข้อสอบใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้");
    if (!confirm1) return;
    const confirm2 = window.confirm("ยืนยันอีกครั้ง: ลบคำถามทั้งหมดถาวร?");
=======
    const confirm1 = window.confirm(
      "⚠️ ต้องการลบคำถามทั้งหมดในคลังข้อสอบ (รวมคำถามจริง 117+ ข้อที่มีอยู่) ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้"
    );
    if (!confirm1) return;
    const confirm2 = window.confirm("ยืนยันอีกครั้ง: ลบคำถามทั้งหมดถาวร? แนะนำให้ Export สำรองไว้ก่อนเสมอ");
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
    if (!confirm2) return;

    setBusy(true);
    setError(null);
    setMsg(null);
    const { error: rpcError } = await supabase.rpc("admin_reset_question_bank");
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setMsg("✅ รีเซ็ตคลังข้อสอบเรียบร้อย");
  };

  return (
    <div className="flex flex-col gap-4">
      {msg && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">{msg}</p>}
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="font-extrabold text-gray-900 text-sm mb-1">📤 ส่งออกข้อมูลสำรอง (Export JSON)</div>
<<<<<<< HEAD
        <p className="text-xs text-gray-400 mb-3.5">
          ดาวน์โหลดคำถาม, ชุดข้อสอบ, เกณฑ์แยกส่วน และหมวดวิชาทั้งหมดเป็นไฟล์ JSON
        </p>
=======
        <p className="text-xs text-gray-400 mb-3.5">ดาวน์โหลดคำถาม, หมวดวิชา, และรอบ/ปีสอบทั้งหมดเป็นไฟล์ JSON</p>
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
        <button
          onClick={handleExport}
          disabled={busy}
          className="px-5 py-2.5 bg-indigo rounded-xl text-white font-bold text-sm disabled:opacity-60"
        >
          {busy ? "กำลังดำเนินการ..." : "📤 ส่งออกข้อมูล"}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="font-extrabold text-gray-900 text-sm mb-1">📥 นำเข้าข้อมูล (Import JSON)</div>
        <p className="text-xs text-gray-400 mb-3.5">
          เลือกไฟล์ JSON ที่ส่งออกไว้ก่อนหน้า ระบบจะ upsert ข้อมูล (แถวที่ id ตรงกันจะถูกอัปเดต)
        </p>
<<<<<<< HEAD
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleImport}
          disabled={busy}
          className="text-sm"
        />
=======
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImport} disabled={busy} className="text-sm" />
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
      </div>

      <div className="bg-white border border-red-200 rounded-2xl p-5">
        <div className="font-extrabold text-red-700 text-sm mb-1">🗑️ รีเซ็ตคลังข้อสอบ</div>
        <p className="text-xs text-gray-400 mb-3.5">
<<<<<<< HEAD
          ลบคำถามทั้งหมดในคลัง (คงโครงสร้างชุดข้อสอบ/หมวดวิชาไว้) — ควร Export สำรองไว้ก่อนเสมอ
=======
          ⚠️ ลบคำถามทั้งหมดในคลัง — ปัจจุบันมีข้อสอบจริงอยู่แล้ว ควร Export สำรองไว้ก่อนกดปุ่มนี้เสมอ
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
        </p>
        <button
          onClick={handleReset}
          disabled={busy}
          className="px-5 py-2.5 bg-red-600 rounded-xl text-white font-bold text-sm disabled:opacity-60"
        >
          {busy ? "กำลังดำเนินการ..." : "🗑️ รีเซ็ตคลังข้อสอบ"}
        </button>
      </div>
    </div>
  );
}
