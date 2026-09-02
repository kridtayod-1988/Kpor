"use client";

import { useState, useTransition } from "react";
import { acceptTermsAction } from "@/app/actions";

export default function TermsGate({
  termsVersionId,
  content,
}: {
  termsVersionId: string;
  content: string;
}) {
  const [accepted, setAccepted] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (accepted) return null;

  const handleAccept = () => {
    if (!checked) return;
    setError(null);
    startTransition(async () => {
      const res = await acceptTermsAction(termsVersionId);
      if (res?.error) setError(res.error);
      else setAccepted(true);
    });
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-5"
      style={{ background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)" }}
    >
      <div className="slide-up bg-white rounded-[22px] w-full max-w-lg shadow-cardLg overflow-hidden">
        <div
          className="px-6 py-5 text-white"
          style={{ background: "linear-gradient(135deg,#4f46e5,#6d28d9)" }}
        >
          <div className="font-extrabold text-lg">ข้อกำหนดและเงื่อนไขการใช้งาน</div>
          <div className="text-xs opacity-75 mt-1">โปรดอ่านและยอมรับก่อนใช้งานครั้งแรก</div>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div className="max-h-64 overflow-y-auto text-sm text-gray-600 leading-relaxed bg-gray-50 border border-gray-200 rounded-xl p-4 whitespace-pre-wrap">
            {content}
          </div>

          <label className="flex items-start gap-2.5 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-indigo cursor-pointer"
            />
            ข้าพเจ้าได้อ่านและยอมรับข้อกำหนดและเงื่อนไขการใช้งานข้างต้นแล้ว
          </label>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            onClick={handleAccept}
            disabled={!checked || isPending}
            className="w-full py-3 rounded-xl text-white font-bold text-sm transition disabled:bg-gray-300 disabled:cursor-not-allowed"
            style={{ background: !checked || isPending ? undefined : "#4f46e5" }}
          >
            {isPending ? "กำลังบันทึก..." : "ยอมรับและเข้าใช้งาน"}
          </button>
        </div>
      </div>
    </div>
  );
}
