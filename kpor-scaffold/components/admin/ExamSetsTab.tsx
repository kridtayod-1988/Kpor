"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addCategory = async () => {
    setError(null);
    if (!newCategory.trim()) return;
    const { error: insertError } = await supabase
      .from("categories")
      .insert({ name: newCategory.trim(), sort_order: categories.length, is_active: true });
    if (insertError) {
      setError(insertError.message);
      return;
    }
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
              </button>
            </div>
          ))}
        </div>
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
    </div>
  );
}
