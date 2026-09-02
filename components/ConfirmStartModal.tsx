"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startAttemptAction } from "@/app/actions";
import type { ExamSet } from "@/lib/types";

const MODE_LABEL: Record<string, { icon: string; text: string; color: string }> = {
  simulation: { icon: "🏟️", text: "จำลองสนามสอบจริง", color: "#1d4ed8" },
  practice: { icon: "✏️", text: "ฝึกพร้อมเฉลยทันที", color: "#0f766e" },
  archive: { icon: "📚", text: "คลังข้อสอบเก่า", color: "#92400e" },
  workshop: { icon: "🛠️", text: "แบบฝึกหัดกำหนดเอง", color: "#6d28d9" },
  category: { icon: "🎯", text: "ฝึกตามหมวดวิชา", color: "#b45309" },
};

export default function ConfirmStartModal({
  examSet,
  onClose,
}: {
  examSet: ExamSet;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const meta = MODE_LABEL[examSet.mode] ?? MODE_LABEL.archive;

  const rows: [string, string][] = [
    ["📋 จำนวนข้อ", `${examSet.question_count} ข้อ`],
    ["🏅 คะแนนเต็ม", `${examSet.max_score} คะแนน`],
    ["⏱️ เวลาสอบ", examSet.time_limit_minutes > 0 ? `${examSet.time_limit_minutes} นาที` : "ไม่จำกัดเวลา"],
    ["✅ เกณฑ์ผ่าน", `${examSet.pass_score} คะแนน${examSet.pass_pct_label ? ` (${examSet.pass_pct_label})` : ""}`],
  ];

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const res = await startAttemptAction(examSet.id, examSet.mode);
      if (res?.error) {
        setError(res.error);
        return;
      }
      router.push(`/exam/${examSet.id}?attempt=${res.attemptId}`);
    });
  };

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center p-5"
      style={{ background: "rgba(0,0,0,.5)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="slide-up bg-white rounded-[22px] w-full max-w-[420px] shadow-cardLg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-6 py-5 text-center text-white"
          style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)` }}
        >
          <div className="text-4xl mb-1.5">{meta.icon}</div>
          <div className="font-black text-base mb-0.5">{examSet.name}</div>
          <div className="text-xs text-white/75">ยืนยันก่อนเข้าสอบ</div>
        </div>

        <div className="mx-5 mt-4 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
          {rows.map(([k, v], i) => (
            <div
              key={k}
              className={`flex justify-between items-center px-3.5 py-2.5 ${
                i < rows.length - 1 ? "border-b border-gray-200" : ""
              }`}
            >
              <span className="text-[.8rem] text-gray-500 font-medium">{k}</span>
              <span className="text-[.84rem] font-extrabold font-mono" style={{ color: meta.color }}>
                {v}
              </span>
            </div>
          ))}
        </div>

        {examSet.is_gpa3 && (
          <div className="mx-5 mt-3 bg-amber-50 border border-amber-200 rounded-[11px] px-3.5 py-2.5 flex gap-2 items-start">
            <span className="text-sm shrink-0">⚠️</span>
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong>เกณฑ์แยกส่วน ก.พ. ระดับ 3:</strong> ต้องผ่านทุกหมวดพร้อมกัน
            </div>
          </div>
        )}

        <div className="mx-5 mt-3 bg-gray-50 border border-gray-200 rounded-[11px] px-3.5 py-2.5 flex gap-2 items-center">
          <span className="text-sm">💡</span>
          <div className="text-xs text-gray-500 leading-relaxed">
            {examSet.mode === "practice"
              ? "ระบบจะแสดงเฉลยทันทีหลังตอบแต่ละข้อ พร้อมคำอธิบาย"
              : "ระบบจะไม่แสดงเฉลยระหว่างสอบ — ตรวจคำตอบได้หลังส่งข้อสอบ"}
          </div>
        </div>

        {error && <p className="mx-5 mt-3 text-xs text-red-600">{error}</p>}

        <div className="flex gap-2.5 px-5 pt-4 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-700 font-semibold text-sm"
          >
            ← ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="flex-[2] py-2.5 rounded-xl text-white font-extrabold text-sm disabled:opacity-70"
            style={{ background: meta.color }}
          >
            {isPending ? "กำลังเตรียมข้อสอบ..." : `${meta.icon} ยืนยัน — เริ่มสอบเลย!`}
          </button>
        </div>
      </div>
    </div>
  );
}
