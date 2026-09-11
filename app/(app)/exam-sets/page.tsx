"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MODES, getMode, type ModeKey } from "@/lib/data/modes";
import ConfirmStartModal from "@/components/ConfirmStartModal";
import type { Category, ExamYear } from "@/lib/types";

export default function ExamSetsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeKey = (searchParams.get("mode") as ModeKey) ?? "full100";
  const mode = getMode(modeKey) ?? MODES[0];

  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [examYears, setExamYears] = useState<ExamYear[]>([]);
  const [fullExamConfig, setFullExamConfig] = useState({ count: 100, minutes: 180 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ id: string | null; name: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();

    (async () => {
      if (mode.key === "category") {
        const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
        if (!cancelled) setCategories((data as Category[]) ?? []);
      } else if (mode.key === "year") {
        const { data } = await supabase.from("exam_years").select("*").eq("is_active", true).order("year", { ascending: false });
        if (!cancelled) setExamYears((data as ExamYear[]) ?? []);
      } else {
        const { data } = await supabase
          .from("system_config")
          .select("full_exam_question_count, full_exam_time_minutes")
          .eq("key", "public")
          .single();
        if (!cancelled && data) {
          setFullExamConfig({ count: data.full_exam_question_count, minutes: data.full_exam_time_minutes });
        }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [mode.key]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()));
  }, [categories, search]);

  const filteredYears = useMemo(() => {
    if (!search.trim()) return examYears;
    return examYears.filter((y) => y.label.toLowerCase().includes(search.trim().toLowerCase()));
  }, [examYears, search]);

  const switchMode = (key: ModeKey) => router.push(`/exam-sets?mode=${key}`);

  return (
    <div className="py-5 pb-12">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-semibold mb-4">
        ← กลับหน้าหลัก
      </Link>

      <div className="flex items-center gap-3 mb-4">
        <div className="text-2xl">{mode.icon}</div>
        <div>
          <div className="font-extrabold text-gray-900 text-lg">{mode.title}</div>
          <div className="text-gray-500 text-sm">{mode.description}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => switchMode(m.key)}
            className="px-3.5 py-1.5 rounded-full text-sm font-semibold transition"
            style={{
              background: m.key === mode.key ? m.accent : "#f3f4f6",
              color: m.key === mode.key ? "#fff" : "#6b7280",
              border: `1.5px solid ${m.key === mode.key ? m.accent : "#e5e7eb"}`,
            }}
          >
            {m.icon} {m.title}
          </button>
        ))}
      </div>

      {mode.key !== "full100" && (
        <div className="relative mb-5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={mode.key === "category" ? "ค้นหาหมวดวิชา..." : "ค้นหารอบ/ปีสอบ..."}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo transition"
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">กำลังโหลด...</div>
      ) : mode.key === "full100" ? (
        <div
          className="bg-white border border-[#e8eaf0] rounded-2xl px-6 py-8 text-center shadow-card cursor-pointer hover:shadow-cardLg transition-all"
          onClick={() => setSelected({ id: null, name: "จำลองสนามจริง ก.พ." })}
        >
          <div className="text-4xl mb-3">🏆</div>
          <div className="font-extrabold text-gray-900 text-base mb-1.5">
            สุ่มข้อสอบเต็มรูปแบบ {fullExamConfig.count} ข้อ
          </div>
          <div className="text-sm text-gray-500 mb-5">จับเวลา {fullExamConfig.minutes} นาที เหมือนสนามสอบจริง</div>
          <button className="px-6 py-2.5 rounded-xl text-white font-bold text-sm" style={{ background: mode.accent }}>
            ทำข้อสอบ
          </button>
        </div>
      ) : mode.key === "category" ? (
        <div className="flex flex-col gap-3">
          {filteredCategories.map((c) => (
            <div key={c.id} className="bg-white border border-[#e8eaf0] rounded-2xl px-5 py-4 flex items-center justify-between gap-4 shadow-card flex-wrap">
              <div className="font-bold text-gray-900 text-[.92rem]">{c.name}</div>
              <button
                onClick={() => setSelected({ id: c.id, name: c.name })}
                className="shrink-0 px-5 py-2.5 rounded-xl text-white font-bold text-sm"
                style={{ background: mode.accent }}
              >
                ทำข้อสอบ
              </button>
            </div>
          ))}
          {filteredCategories.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">ไม่พบหมวดวิชาที่ตรงกับคำค้นหา</div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredYears.map((y) => (
            <div key={y.id} className="bg-white border border-[#e8eaf0] rounded-2xl px-5 py-4 flex items-center justify-between gap-4 shadow-card flex-wrap">
              <div>
                <div className="font-bold text-gray-900 text-[.92rem]">{y.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">พ.ศ. {y.year}</div>
              </div>
              <button
                onClick={() => setSelected({ id: y.id, name: y.label })}
                className="shrink-0 px-5 py-2.5 rounded-xl text-white font-bold text-sm"
                style={{ background: mode.accent }}
              >
                ทำข้อสอบ
              </button>
            </div>
          ))}
          {filteredYears.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">ไม่พบรอบ/ปีสอบที่ตรงกับคำค้นหา</div>
          )}
        </div>
      )}

      {selected && (
        <ConfirmStartModal
          mode={mode.key}
          itemId={selected.id}
          itemName={selected.name}
          questionCount={mode.key === "full100" ? fullExamConfig.count : 20}
          timeLimitMinutes={mode.key === "full100" ? fullExamConfig.minutes : null}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
