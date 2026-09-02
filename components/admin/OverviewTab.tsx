"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

<<<<<<< HEAD
type Stat = { subcategory_id: string; subcategory_name: string; group_name: string; question_count: number };

export default function OverviewTab() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [totals, setTotals] = useState({ examSets: 0, users: 0, attempts: 0 });
=======
type Stat = { category_id: string; category_name: string; question_count: number };

export default function OverviewTab() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [totals, setTotals] = useState({ years: 0, users: 0, attempts: 0 });
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
<<<<<<< HEAD
      const [{ data: statsData }, { count: examSetsCount }, { count: usersCount }, { count: attemptsCount }] =
        await Promise.all([
          supabase.rpc("get_question_bank_stats"),
          supabase.from("exam_sets").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("user_attempts").select("id", { count: "exact", head: true }),
        ]);
      setStats((statsData as Stat[]) ?? []);
      setTotals({ examSets: examSetsCount ?? 0, users: usersCount ?? 0, attempts: attemptsCount ?? 0 });
=======
      const [{ data: statsData }, { count: yearsCount }, { count: usersCount }, { count: attemptsCount }] =
        await Promise.all([
          supabase.rpc("get_question_bank_stats"),
          supabase.from("exam_years").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("exam_attempts").select("id", { count: "exact", head: true }),
        ]);
      setStats((statsData as Stat[]) ?? []);
      setTotals({ years: yearsCount ?? 0, users: usersCount ?? 0, attempts: attemptsCount ?? 0 });
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
      setLoading(false);
    })();
  }, []);

  const totalQuestions = stats.reduce((s, x) => s + Number(x.question_count), 0);
  const maxCount = Math.max(1, ...stats.map((s) => Number(s.question_count)));

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">กำลังโหลดสถิติ...</div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ["📝 ข้อสอบทั้งหมด", totalQuestions],
<<<<<<< HEAD
          ["📚 ชุดข้อสอบ", totals.examSets],
=======
          ["📚 รอบ/ปีสอบ", totals.years],
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
          ["👥 ผู้ใช้", totals.users],
          ["🧾 การทำข้อสอบ", totals.attempts],
        ].map(([label, val]) => (
          <div key={label as string} className="bg-white border border-gray-200 rounded-2xl p-4 text-center shadow-sm">
            <div className="text-2xl font-black text-indigo font-mono">{val as number}</div>
            <div className="text-xs text-gray-500 mt-1">{label as string}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="font-extrabold text-gray-900 text-sm mb-4">📊 สัดส่วนคลังข้อสอบตามหมวดวิชา</div>
        <div className="flex flex-col gap-2.5">
          {stats.map((s) => (
<<<<<<< HEAD
            <div key={s.subcategory_id}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-700 font-semibold">
                  {s.subcategory_name} <span className="text-gray-400 font-normal">({s.group_name})</span>
                </span>
=======
            <div key={s.category_id}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-700 font-semibold">{s.category_name}</span>
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
                <span className="font-bold text-gray-900">{s.question_count} ข้อ</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo rounded-full"
                  style={{ width: `${(Number(s.question_count) / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
