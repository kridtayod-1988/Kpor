"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
<<<<<<< HEAD
import { saveAnswerAction, revealAnswerAction, submitAttemptAction } from "@/app/actions";

const ALPHA = ["ก", "ข", "ค", "ง"];

type SafeQuestion = {
  id: string;
  subcategory_id: string;
  text: string;
  passage: string | null;
  choices: string[];
  position: number;
  points: number;
};
=======
import { saveAnswerAction, toggleFlagAction, revealAnswerAction, submitAttemptAction } from "@/app/actions";
import type { SafeQuestion } from "@/lib/types";

const ALPHA = ["ก", "ข", "ค", "ง", "จ", "ฉ"];
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc

type AnswerState = {
  selected: number | null;
  flagged: boolean;
  revealed: boolean;
  correctIndex?: number;
  explanation?: string;
};

export default function ExamRunner({
  attemptId,
<<<<<<< HEAD
  mode,
  startedAt,
  timeLimitMinutes,
  examSetName,
  questions,
  initialAnswers,
}: {
  attemptId: string;
  mode: string;
  startedAt: string;
  timeLimitMinutes: number;
  examSetName: string;
  questions: SafeQuestion[];
  initialAnswers: Record<string, { selected_index: number | null; is_flagged: boolean }>;
}) {
  const router = useRouter();
  const isPractice = mode === "practice";
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() => {
    const init: Record<string, AnswerState> = {};
    for (const q of questions) {
      const existing = initialAnswers[q.id];
      init[q.id] = {
        selected: existing?.selected_index ?? null,
        flagged: existing?.is_flagged ?? false,
        revealed: false,
      };
    }
=======
  instantReveal,
  startedAt,
  timeLimitMinutes,
  examLabel,
  questions,
  initialAnswers,
  initialFlags,
}: {
  attemptId: string;
  instantReveal: boolean;
  startedAt: string;
  timeLimitMinutes: number; // 0 = ไม่จำกัดเวลา
  examLabel: string;
  questions: SafeQuestion[];
  initialAnswers: (number | null)[];
  initialFlags: string[];
}) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() => {
    const init: Record<string, AnswerState> = {};
    questions.forEach((q, i) => {
      init[q.id] = {
        selected: initialAnswers[i] ?? null,
        flagged: initialFlags.includes(q.id),
        revealed: false,
      };
    });
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
    return init;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

<<<<<<< HEAD
  // ── Timer ──
=======
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
  const deadline = useMemo(() => {
    if (timeLimitMinutes <= 0) return null;
    return new Date(startedAt).getTime() + timeLimitMinutes * 60_000;
  }, [startedAt, timeLimitMinutes]);
  const [remaining, setRemaining] = useState<number | null>(
    deadline ? Math.max(0, Math.floor((deadline - Date.now()) / 1000)) : null
  );
  const autoSubmitted = useRef(false);

  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => {
      const r = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0 && !autoSubmitted.current) {
        autoSubmitted.current = true;
        handleSubmit(true);
      }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  const q = questions[idx];
  const ua = answers[q.id];

  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const selectChoice = (choiceIdx: number) => {
    if (ua.revealed) return;
    setAnswers((prev) => ({ ...prev, [q.id]: { ...prev[q.id], selected: choiceIdx } }));
<<<<<<< HEAD
    saveAnswerAction(attemptId, q.id, choiceIdx, ua.flagged);
  };

  const toggleFlag = () => {
    const next = !ua.flagged;
    setAnswers((prev) => ({ ...prev, [q.id]: { ...prev[q.id], flagged: next } }));
    saveAnswerAction(attemptId, q.id, ua.selected, next);
=======
    saveAnswerAction(attemptId, q.id, choiceIdx);
  };

  const toggleFlag = () => {
    setAnswers((prev) => ({ ...prev, [q.id]: { ...prev[q.id], flagged: !prev[q.id].flagged } }));
    toggleFlagAction(attemptId, q.id);
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
  };

  const goTo = (i: number) => setIdx(Math.max(0, Math.min(questions.length - 1, i)));

  const handleNext = async () => {
<<<<<<< HEAD
    if (isPractice && ua.selected !== null && !ua.revealed) {
=======
    if (instantReveal && ua.selected !== null && !ua.revealed) {
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
      const res = await revealAnswerAction(q.id, attemptId);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setAnswers((prev) => ({
        ...prev,
        [q.id]: { ...prev[q.id], revealed: true, correctIndex: res.correctIndex, explanation: res.explanation },
      }));
      return;
    }
    if (idx < questions.length - 1) goTo(idx + 1);
    else handleSubmit(false);
  };

  const handleSubmit = async (isAuto: boolean) => {
    if (!isAuto) {
      const confirmed = window.confirm("ยืนยันส่งกระดาษคำตอบ? หลังจากนี้จะไม่สามารถแก้ไขคำตอบได้อีก");
      if (!confirmed) return;
    }
    setSubmitting(true);
    setError(null);
    const res = await submitAttemptAction(attemptId);
    if (res?.error) {
      setError(res.error);
      setSubmitting(false);
      return;
    }
    router.push(`/result/${attemptId}`);
  };

  const answeredCount = Object.values(answers).filter((a) => a.selected !== null).length;
<<<<<<< HEAD
  const nextDisabled = isPractice && ua.selected === null && !ua.revealed;
  const nextLabel = isPractice && ua.selected !== null && !ua.revealed
    ? "ตรวจคำตอบ ✅"
    : idx === questions.length - 1
      ? "ส่งข้อสอบ 📤"
      : "ถัดไป ▶";
=======
  const nextDisabled = instantReveal && ua.selected === null && !ua.revealed;
  const nextLabel =
    instantReveal && ua.selected !== null && !ua.revealed
      ? "ตรวจคำตอบ ✅"
      : idx === questions.length - 1
        ? "ส่งข้อสอบ 📤"
        : "ถัดไป ▶";
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc

  const timerColor =
    remaining !== null && remaining <= 300 ? "#dc2626" : remaining !== null && remaining <= 900 ? "#d97706" : "#111827";

  return (
    <div className="py-4 pb-16">
<<<<<<< HEAD
      {/* Top bar */}
      <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3 flex items-center justify-between mb-3.5 shadow-sm flex-wrap gap-2">
        <div>
          <div className="text-[.69rem] font-bold tracking-wider uppercase text-gray-500">
            {isPractice ? "✏️ ฝึกพร้อมเฉลยทันที" : "🏟️ จำลองสนามสอบ"}
          </div>
          <div className="font-extrabold text-gray-900 text-sm mt-0.5">{examSetName}</div>
=======
      <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3 flex items-center justify-between mb-3.5 shadow-sm flex-wrap gap-2">
        <div>
          <div className="text-[.69rem] font-bold tracking-wider uppercase text-gray-500">
            {instantReveal ? "✏️ ฝึกพร้อมเฉลยทันที" : "🏟️ จำลองสนามสอบ"}
          </div>
          <div className="font-extrabold text-gray-900 text-sm mt-0.5">{examLabel}</div>
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
        </div>
        <div className="flex gap-2 items-center">
          <div
            className="rounded-full px-3.5 py-1.5 font-mono text-sm font-bold text-white"
            style={{ background: remaining !== null ? timerColor : "#111827" }}
          >
            {remaining !== null ? `⏱ ${fmtTime(remaining)}` : "∞ ไม่จำกัดเวลา"}
          </div>
          <button
            onClick={() => handleSubmit(false)}
            className="px-3.5 py-1.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-semibold"
          >
            ✕ ส่งข้อสอบ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3.5 items-start">
<<<<<<< HEAD
        {/* Question card */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {q.passage && (
            <div className="bg-indigo-50 border-l-4 border-indigo px-4.5 py-3.5 text-sm leading-loose text-indigo-950 whitespace-pre-wrap">
              📄 {q.passage}
=======
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {q.table_data && (
            <div className="bg-indigo-50 border-l-4 border-indigo px-4.5 py-3.5 text-sm leading-loose text-indigo-950">
              📊 <pre className="whitespace-pre-wrap font-sans inline">{JSON.stringify(q.table_data, null, 2)}</pre>
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
            </div>
          )}
          <div className="p-5">
            <div className="text-[.69rem] font-bold uppercase tracking-wider text-gray-400 mb-2.5">
              ข้อที่ {idx + 1} จาก {questions.length}
            </div>
<<<<<<< HEAD
            <div className="text-[.96rem] font-bold text-gray-900 leading-relaxed mb-4.5">{q.text}</div>

            <div className="flex flex-col gap-2">
              {q.choices.map((choice, i) => {
                let style = "border-gray-200 bg-gray-50 text-gray-900";
                if (isPractice && ua.revealed) {
=======
            <div className="text-[.96rem] font-bold text-gray-900 leading-relaxed mb-4.5">{q.question_text}</div>

            <div className="flex flex-col gap-2">
              {q.options.map((choice, i) => {
                let style = "border-gray-200 bg-gray-50 text-gray-900";
                if (instantReveal && ua.revealed) {
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
                  if (i === ua.correctIndex) style = "border-green-500 bg-green-50 text-green-800 font-bold";
                  else if (ua.selected === i) style = "border-red-500 bg-red-50 text-red-800 font-bold";
                  else style = "border-gray-200 bg-gray-50 text-gray-400 opacity-50";
                } else if (ua.selected === i) {
                  style = "border-indigo bg-indigo-50 text-indigo-900 font-bold";
                }
                return (
                  <button
                    key={i}
                    onClick={() => selectChoice(i)}
<<<<<<< HEAD
                    disabled={isPractice && ua.revealed}
=======
                    disabled={instantReveal && ua.revealed}
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
                    className={`flex items-center gap-3.5 text-left w-full px-4 py-3 rounded-xl border-[1.5px] text-[.91rem] leading-relaxed transition ${style}`}
                  >
                    <span className="w-6 h-6 rounded-md bg-gray-200 flex items-center justify-center text-xs font-bold shrink-0">
                      {ALPHA[i]}
                    </span>
                    <span className="flex-1">{choice}</span>
                  </button>
                );
              })}
            </div>

<<<<<<< HEAD
            {isPractice && ua.revealed && (
=======
            {instantReveal && ua.revealed && (
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
              <div
                className={`mt-4 rounded-xl p-3.5 border-[1.5px] ${
                  ua.selected === ua.correctIndex ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                }`}
              >
                <div className={`font-extrabold text-sm mb-1.5 ${ua.selected === ua.correctIndex ? "text-green-700" : "text-red-700"}`}>
                  {ua.selected === ua.correctIndex ? "✅ ถูกต้อง! เยี่ยมมาก" : `❌ ผิด — เฉลยคือข้อ ${ALPHA[ua.correctIndex ?? 0]}`}
                </div>
                {ua.explanation && (
                  <div className="text-[.84rem] text-gray-700 leading-relaxed bg-black/5 rounded-lg px-3 py-2">
                    📖 {ua.explanation}
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

            <div className="flex justify-between gap-2 mt-5 pt-4 border-t border-gray-100">
              <div className="flex gap-2">
                <button
                  onClick={() => goTo(idx - 1)}
                  disabled={idx === 0}
                  className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold disabled:opacity-30"
                >
                  ◀ ย้อนกลับ
                </button>
                <button
                  onClick={toggleFlag}
                  className={`px-4 py-2.5 rounded-lg border text-sm font-semibold ${
                    ua.flagged ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-gray-200 text-gray-500"
                  }`}
                >
                  {ua.flagged ? "🚩 ตั้งธงแล้ว" : "🏳️ ตั้งธง"}
                </button>
              </div>
              <button
                onClick={handleNext}
                disabled={nextDisabled || submitting}
                className="px-6 py-2.5 rounded-lg text-white font-bold text-sm disabled:bg-gray-300"
<<<<<<< HEAD
                style={{ background: nextDisabled ? undefined : isPractice ? "#0f766e" : "#4f46e5" }}
=======
                style={{ background: nextDisabled ? undefined : instantReveal ? "#0f766e" : "#4f46e5" }}
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
              >
                {submitting ? "กำลังส่ง..." : nextLabel}
              </button>
            </div>
          </div>
        </div>

<<<<<<< HEAD
        {/* Navigator */}
=======
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
        <div className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-sm sticky top-16">
          <div className="text-[.69rem] font-bold uppercase tracking-wider text-gray-400 text-center mb-2.5">
            แผงข้อสอบ
          </div>
          <div className="flex flex-wrap gap-1 justify-center mb-3">
            {questions.map((qq, i) => {
              const a = answers[qq.id];
              let bg = "#f9fafb", bc = "#e5e7eb", col = "#9ca3af";
              if (a.flagged) { bg = "#fffbeb"; bc = "#f2c744"; col = "#b45309"; }
              else if (a.selected !== null) { bg = "#eff6ff"; bc = "#4f46e5"; col = "#4f46e5"; }
              return (
                <button
                  key={qq.id}
                  onClick={() => goTo(i)}
                  className="w-7 h-7 rounded-md text-xs font-bold font-mono"
                  style={{
                    background: bg,
                    border: `1.5px solid ${bc}`,
                    color: col,
                    outline: i === idx ? "2px solid #4f46e5" : "none",
                    outlineOffset: 1,
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="text-center text-[.77rem] text-gray-500 font-semibold mb-2.5">
            ตอบแล้ว {answeredCount} / {questions.length} ข้อ
          </div>
          <button
            onClick={() => handleSubmit(false)}
            className="w-full py-2.5 bg-green-600 rounded-lg text-white text-sm font-bold"
          >
            📤 ส่งข้อสอบ
          </button>
        </div>
      </div>
    </div>
  );
}
