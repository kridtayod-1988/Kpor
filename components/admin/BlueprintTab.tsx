"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

<<<<<<< HEAD
type Section = {
  id: string;
  label: string;
  icon: string | null;
  question_count: number;
  max_score: number;
  pass_score: number;
  description: string | null;
};

export default function BlueprintTab() {
  const [sections, setSections] = useState<Section[]>([]);
=======
type Stat = { category_id: string; category_name: string; question_count: number };

export default function BlueprintTab() {
  const [config, setConfig] = useState<{ count: number; minutes: number } | null>(null);
  const [stats, setStats] = useState<Stat[]>([]);
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
<<<<<<< HEAD
      const { data: examSet } = await supabase.from("exam_sets").select("id, name, question_count, max_score, time_limit_minutes").eq("slug", "GPA3001").single();
      if (examSet) {
        const { data } = await supabase
          .from("exam_set_sections")
          .select("id, label, icon, question_count, max_score, pass_score, description")
          .eq("exam_set_id", examSet.id)
          .order("sort_order");
        setSections((data as Section[]) ?? []);
      }
=======
      const [{ data: cfg }, { data: statsData }] = await Promise.all([
        supabase.from("system_config").select("full_exam_question_count, full_exam_time_minutes").eq("key", "public").single(),
        supabase.rpc("get_question_bank_stats"),
      ]);
      if (cfg) setConfig({ count: cfg.full_exam_question_count, minutes: cfg.full_exam_time_minutes });
      setStats((statsData as Stat[]) ?? []);
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">กำลังโหลด...</div>;

<<<<<<< HEAD
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="font-extrabold text-gray-900 text-sm mb-1">
        📐 พิมพ์เขียวโครงสร้างข้อสอบ ก.พ. ระดับ 3
      </div>
      <div className="text-xs text-gray-400 mb-4">100 ข้อ · 200 คะแนน · เกณฑ์ผ่านแยกส่วน 3 หมวดวิชา (ต้องผ่านทุกหมวดพร้อมกัน)</div>

      <div className="flex flex-col gap-3">
        {sections.map((s) => (
          <div key={s.id} className="border border-gray-200 rounded-xl p-4 flex items-start gap-3">
            <div className="text-2xl">{s.icon}</div>
            <div className="flex-1">
              <div className="font-bold text-gray-900 text-sm">{s.label}</div>
              <div className="text-xs text-gray-500 mt-1">{s.description}</div>
              <div className="flex gap-3 mt-2 text-xs">
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo rounded-full font-semibold">
                  {s.question_count} ข้อ
                </span>
                <span className="px-2 py-0.5 bg-gray-50 text-gray-600 rounded-full font-semibold">
                  เต็ม {s.max_score} คะแนน
                </span>
                <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-semibold">
                  ผ่าน ≥{s.pass_score} คะแนน
                </span>
              </div>
            </div>
          </div>
        ))}
        {sections.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            ไม่พบชุดข้อสอบ GPA3001 — ตรวจสอบว่ารัน seed data ใน schema.sql แล้วหรือยัง
          </div>
        )}
=======
  const totalQuestions = stats.reduce((s, x) => s + Number(x.question_count), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="font-extrabold text-gray-900 text-sm mb-1">📐 โครงสร้างโหมด "จำลองสนามจริง"</div>
        <div className="text-xs text-gray-400 mb-4">ตั้งค่าจำนวนข้อและเวลาสอบสำหรับโหมด full100 (สุ่มจากคลังทั้งหมด)</div>
        <div className="flex gap-3">
          <span className="px-3 py-1.5 bg-indigo-50 text-indigo rounded-full text-sm font-semibold">
            {config?.count ?? "-"} ข้อ
          </span>
          <span className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-full text-sm font-semibold">
            {config?.minutes ?? "-"} นาที
          </span>
          <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-semibold">
            มีในคลัง {totalQuestions} ข้อ
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          แก้ไขค่านี้ได้จากตาราง <code className="bg-gray-100 px-1 rounded">system_config</code> (แถว key=&apos;public&apos;)
          ใน Supabase Table Editor โดยตรง — ยังไม่มี UI แก้ไขในสแคฟโฟลด์นี้
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="font-extrabold text-gray-900 text-sm mb-3.5">📊 จำนวนข้อสอบต่อหมวดวิชา</div>
        <div className="flex flex-col gap-2">
          {stats.map((s) => (
            <div key={s.category_id} className="flex justify-between items-center px-3.5 py-2.5 bg-gray-50 rounded-lg">
              <span className="text-sm font-semibold text-gray-700">{s.category_name}</span>
              <span className="text-sm font-bold text-indigo">{s.question_count} ข้อ</span>
            </div>
          ))}
        </div>
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
      </div>
    </div>
  );
}
