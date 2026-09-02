"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ReviewRow } from "@/lib/types";

const ALPHA = ["ก", "ข", "ค", "ง", "จ", "ฉ"];

export default function ResultView({
  examLabel,
  score,
  totalQuestions,
  expGained,
  durationSeconds,
  review,
  categoryNames,
}: {
  examLabel: string;
  score: number;
  totalQuestions: number;
  expGained: number;
  durationSeconds: number;
  review: ReviewRow[];
  categoryNames: Record<string, string>;
}) {
  const [filter, setFilter] = useState<"all" | "wrong" | "correct" | "flagged">("all");
  const pct = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const correctCount = review.filter((r) => r.is_correct).length;
  const wrongCount = review.filter((r) => r.selected_index !== null && !r.is_correct).length;
  const skippedCount = review.filter((r) => r.selected_index === null).length;

  const ringColor = pct >= 80 ? "#16a34a" : pct >= 60 ? "#d97706" : "#dc2626";
  const ringCirc = 314;
  const ringOff = Math.round(ringCirc * (1 - pct / 100));

  const fmtElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const filteredReview = review.filter((r) => {
    if (filter === "wrong") return r.selected_index !== null && !r.is_correct;
    if (filter === "correct") return r.is_correct;
    if (filter === "flagged") return r.is_flagged;
    return true;
  });

  // สรุปคะแนนแยกตามหมวดวิชา (คำนวณจากผลรีวิว ไม่ใช่ค่าคงที่ในฐานข้อมูล)
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { total: number; correct: number }> = {};
    for (const r of review) {
      map[r.category_id] ??= { total: 0, correct: 0 };
      map[r.category_id].total += 1;
      if (r.is_correct) map[r.category_id].correct += 1;
    }
    return Object.entries(map).map(([catId, v]) => ({
      categoryId: catId,
      name: categoryNames[catId] ?? "ไม่ระบุหมวด",
      ...v,
      pct: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
    }));
  }, [review, categoryNames]);

  return (
    <div className="py-5 pb-16 fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 font-semibold">
          🏠 หน้าหลัก
        </Link>
        <Link
          href="/exam-sets"
          className="ml-auto text-sm px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo font-bold"
        >
          🔁 ทำชุดอื่นต่อ
        </Link>
      </div>

      <div
        className="rounded-[22px] px-6 py-7 mb-4 text-center text-white shadow-[0_8px_28px_rgba(79,70,229,.32)]"
        style={{ background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)" }}
      >
        <div className="text-3xl mb-1.5">{pct >= 80 ? "🏆" : pct >= 60 ? "👍" : pct >= 40 ? "📚" : "💪"}</div>
        <div className="font-extrabold text-base mb-1">{examLabel}</div>
        <div className="text-xs opacity-70 mb-5">ใช้เวลา {fmtElapsed(durationSeconds)}</div>

        <div className="relative w-[130px] h-[130px] mx-auto mb-3.5 flex items-center justify-center">
          <svg width="130" height="130" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="50" fill="none" stroke={ringColor} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={ringCirc} strokeDashoffset={ringOff} transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="absolute text-center">
            <div className="text-[1.7rem] font-black font-mono leading-none">{pct}%</div>
            <div className="text-xs opacity-80 mt-0.5">{score}/{totalQuestions}</div>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full px-4.5 py-2 text-sm font-bold bg-white/15 border border-white/25">
          ⭐ +{expGained} EXP
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-4">
        {[
          [correctCount, "✅ ถูก", "#f0fdf4", "#16a34a"],
          [wrongCount, "❌ ผิด", "#fef2f2", "#dc2626"],
          [skippedCount, "⬜ ไม่ตอบ", "#f9fafb", "#9ca3af"],
        ].map(([val, lbl, bg, tc]) => (
          <div key={lbl as string} className="rounded-xl p-3.5 text-center border border-gray-200" style={{ background: bg as string }}>
            <div className="text-xl font-black font-mono" style={{ color: tc as string }}>{val}</div>
            <div className="text-[.67rem] text-gray-400 mt-1">{lbl}</div>
          </div>
        ))}
      </div>

      {categoryBreakdown.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm">
          <div className="font-extrabold text-gray-900 text-sm mb-3.5">📊 ผลแยกตามหมวดวิชา</div>
          {categoryBreakdown.map((c) => (
            <div key={c.categoryId} className="mb-3 last:mb-0">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-700 font-semibold">{c.name}</span>
                <span className="font-bold text-gray-900">{c.correct}/{c.total} ({c.pct}%)</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${c.pct}%`, background: c.pct >= 60 ? "#16a34a" : "#dc2626" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
          <div className="font-extrabold text-gray-900 text-sm">📋 ตรวจทานคำตอบ</div>
          <div className="flex gap-1.5">
            {([
              ["all", "ทั้งหมด"],
              ["wrong", "❌ ผิด"],
              ["correct", "✅ ถูก"],
              ["flagged", "🚩 ตั้งธง"],
            ] as const).map(([f, l]) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: filter === f ? "#4f46e5" : "#f3f4f6", color: filter === f ? "#fff" : "#6b7280" }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {filteredReview.map((r) => (
            <div
              key={r.question_id}
              className="rounded-xl p-3.5 border-l-4"
              style={{ background: r.is_correct ? "#f0fdf4" : "#fef2f2", borderColor: r.is_correct ? "#16a34a" : "#dc2626" }}
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-extrabold text-sm">ข้อ {r.question_position}</span>
                <span className="text-[.68rem] text-gray-400">{categoryNames[r.category_id] ?? ""}</span>
                {r.is_flagged && <span className="text-xs">🚩</span>}
                <span className="ml-auto font-bold">{r.is_correct ? "✅" : "❌"}</span>
              </div>
              <div className="text-sm font-semibold text-gray-900 mb-2 leading-relaxed">{r.question_text}</div>
              <div className="flex flex-col gap-1 mb-2">
                {r.options.map((choice, ci) => {
                  const isCorrect = ci === r.correct_answer_index;
                  const isSelected = ci === r.selected_index;
                  if (!isCorrect && !isSelected) return null;
                  return (
                    <div
                      key={ci}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm"
                      style={{ background: isCorrect ? "#dcfce7" : "#fee2e2" }}
                    >
                      <span className="font-extrabold" style={{ color: isCorrect ? "#16a34a" : "#dc2626" }}>
                        {ALPHA[ci]}.
                      </span>
                      <span className="flex-1">{choice}</span>
                      <span>{isCorrect ? "✓" : "✗"}</span>
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-gray-600 italic bg-black/5 rounded-lg px-2.5 py-2">
                📖 {r.explanation}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
