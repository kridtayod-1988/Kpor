"use client";

import { useState, useTransition } from "react";
import { startAttemptAction } from "@/app/actions";
import type { ModeKey } from "@/lib/data/modes";

const MODE_META: Record<ModeKey, { icon: string; color: string }> = {
  full100: { icon: "🏆", color: "#1d4ed8" },
  category: { icon: "🎯", color: "#b45309" },
  year: { icon: "📚", color: "#0f766e" },
};

export default function ConfirmStartModal({
  mode,
  itemId,
  itemName,
  questionCount,
  timeLimitMinutes,
  onClose,
}: {
  mode: ModeKey;
  itemId: string | null;
  itemName: string;
  questionCount: number;
  timeLimitMinutes: number | null;
  onClose: () => void;
}) {
  const [instantReveal, setInstantReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const meta = MODE_META[mode];

  const rows: [string, string][] = [
    ["📋 จำนวนข้อ", `~${questionCount} ข้อ`],
    ["⏱️ เวลาสอบ", timeLimitMinutes ? `${timeLimitMinutes} นาที` : "ไม่จำกัดเวลา"],
  ];

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const categoryId = mode === "category" ? itemId : null;
      const examYearId = mode === "year" ? itemId : null;
      const res = await startAttemptAction(mode, categoryId, examYearId, instantReveal);
      // startAttemptAction จะ redirect ให้เองเมื่อสำเร็จ (โยน NEXT_REDIRECT) — ถ้าไปถึงตรงนี้คือ error
      if (res?.error) setError(res.error);
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
          <div className="font-black text-base mb-0.5">{itemName}</div>
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

        <label className="mx-5 mt-3 flex items-center justify-between bg-teal-50 border border-teal-200 rounded-[11px] px-3.5 py-2.5 cursor-pointer select-none">
          <span className="text-xs text-teal-900 leading-relaxed">
            ✏️ <strong>ฝึกพร้อมเฉลยทันที</strong> — เห็นเฉลยทีละข้อระหว่างทำ
          </span>
          <input
            type="checkbox"
            checked={instantReveal}
            onChange={(e) => setInstantReveal(e.target.checked)}
            className="w-4 h-4 accent-teal-700 shrink-0"
          />
        </label>

        <div className="mx-5 mt-3 bg-gray-50 border border-gray-200 rounded-[11px] px-3.5 py-2.5 flex gap-2 items-center">
          <span className="text-sm">💡</span>
          <div className="text-xs text-gray-500 leading-relaxed">
            {instantReveal
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
