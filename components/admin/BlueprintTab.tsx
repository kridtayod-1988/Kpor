"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: examSet } = await supabase.from("exam_sets").select("id, name, question_count, max_score, time_limit_minutes").eq("slug", "GPA3001").single();
      if (examSet) {
        const { data } = await supabase
          .from("exam_set_sections")
          .select("id, label, icon, question_count, max_score, pass_score, description")
          .eq("exam_set_id", examSet.id)
          .order("sort_order");
        setSections((data as Section[]) ?? []);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">กำลังโหลด...</div>;

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
      </div>
    </div>
  );
}
