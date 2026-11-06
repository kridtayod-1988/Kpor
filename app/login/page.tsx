"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });
    if (signInError) {
      setError("เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="slide-up w-full max-w-sm bg-white rounded-[22px] shadow-cardLg border border-[#e8eaf0] overflow-hidden">
        <div
          className="px-8 pt-10 pb-8 text-center text-white"
          style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed 60%,#6d28d9)" }}
        >
          <div className="text-3xl mb-2">🎓</div>
          <div className="font-extrabold text-lg">คลังข้อสอบจริง ก.พ.</div>
          <div className="text-sm opacity-75 mt-1">E-EXAM 2569</div>
        </div>

        <div className="p-8 flex flex-col gap-5">
          <p className="text-sm text-gray-500 text-center leading-relaxed">
            เข้าสู่ระบบเพื่อฝึกทำข้อสอบจริง ก.พ. พร้อมเฉลยละเอียดแบบ step-by-step
            และติดตามความก้าวหน้าของคุณ
          </p>

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="flex items-center justify-center gap-3 w-full py-3 rounded-xl border border-gray-300 bg-white font-semibold text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.8 2.73v2.27h2.92c1.7-1.57 2.68-3.88 2.68-6.64z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.27c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33C2.44 15.98 5.48 18 9 18z" />
              <path fill="#FBBC05" d="M3.97 10.71a5.4 5.4 0 010-3.42V4.96H.96a9 9 0 000 8.08l3.01-2.33z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
            </svg>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วย Google"}
          </button>

          {error && <p className="text-xs text-red-600 text-center">{error}</p>}

          <p className="text-[11px] text-gray-400 text-center leading-relaxed">
            การเข้าสู่ระบบถือว่าคุณยอมรับข้อกำหนดและเงื่อนไขการใช้งาน
            ซึ่งจะแสดงให้ยืนยันอีกครั้งก่อนใช้งานครั้งแรก
          </p>
        </div>
      </div>
    </div>
  );
}
