"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MODES, getMode, type ModeKey } from "@/lib/data/modes";
import ConfirmStartModal from "@/components/ConfirmStartModal";
import type { ExamSet } from "@/lib/types";

// โหมด archive ใช้ตาราง exam_sets ที่ mode='archive' หรือ 'simulation' (คลังข้อสอบ/ชุดจำลอง)
// โหมด practice ใช้ mode='practice' หรือดึงชุดเดียวกันแต่ให้ผู้ใช้เลือกว่าจะฝึกแบบเฉลยทันที
const MODE_TO_DB_MODES: Record<ModeKey, string[]> = {
  archive: ["archive", "simulation"],
  practice: ["archive", "simulation", "practice"],
  category: ["archive", "simulation"],
  workshop: ["workshop"],
};

export default function ExamSetsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeKey = (searchParams.get("mode") as ModeKey) ?? "archive";
  const mode = getMode(modeKey) ?? MODES[0];

  const [search, setSearch] = useState("");
  const [examSets, setExamSets] = useState<ExamSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSet, setSelectedSet] = useState<ExamSet | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    const dbModes = MODE_TO_DB_MODES[mode.key] ?? ["archive"];

    supabase
      .from("exam_sets")
      .select("*")
      .in("mode", dbModes)
      .eq("is_published", true)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setExamSets(data as ExamSet[]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode.key]);

  const filteredSets = useMemo(() => {
    if (!search.trim()) return examSets;
    const q = search.trim().toLowerCase();
    return examSets.filter((s) => s.name.toLowerCase().includes(q));
  }, [examSets, search]);

  const switchMode = (key: ModeKey) => {
    router.push(`/exam-sets?mode=${key}`);
  };

  return (
    <div className="py-5 pb-12">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-semibold mb-4"
      >
        ← กลับหน้าหลัก
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="text-2xl">{mode.icon}</div>
        <div>
          <div className="font-extrabold text-gray-900 text-lg">{mode.title}</div>
          <div className="text-gray-500 text-sm">{mode.description}</div>
        </div>
      </div>

      {/* Quick-switch mode chips */}
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

      {/* Search box */}
      <div className="relative mb-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อชุดข้อสอบ..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo transition"
        />
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">กำลังโหลดชุดข้อสอบ...</div>
      ) : filteredSets.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm bg-white border border-dashed border-gray-200 rounded-2xl">
          ไม่พบชุดข้อสอบที่ตรงกับคำค้นหา
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredSets.map((set) => (
            <div
              key={set.id}
              className="bg-white border border-[#e8eaf0] rounded-2xl px-5 py-4 flex items-center justify-between gap-4 shadow-card flex-wrap"
            >
              <div className="min-w-[200px] flex-1">
                <div className="font-bold text-gray-900 text-[.92rem]">{set.name}</div>
                <div className="text-gray-500 text-xs mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  <span>📋 {set.question_count} ข้อ</span>
                  <span>🏅 {set.max_score} คะแนน</span>
                  <span>
                    ⏱️ {set.time_limit_minutes > 0 ? `${set.time_limit_minutes} นาที` : "ไม่จำกัดเวลา"}
                  </span>
                  <span>
                    ✅ ผ่าน ≥{set.pass_score} คะแนน{set.pass_pct_label ? ` (${set.pass_pct_label})` : ""}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedSet(set)}
                className="shrink-0 px-5 py-2.5 rounded-xl text-white font-bold text-sm"
                style={{ background: mode.accent }}
              >
                ทำข้อสอบ
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedSet && (
        <ConfirmStartModal examSet={selectedSet} onClose={() => setSelectedSet(null)} />
      )}
    </div>
  );
}
