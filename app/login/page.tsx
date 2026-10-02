"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const getRedirectUrl = () =>
  `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`;

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearFeedback = () => {
    setError(null);
    setMessage(null);
  };

  const signInWithGoogle = async () => {
    clearFeedback();
    setLoading(true);
    const { error: signInError } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getRedirectUrl() },
    });
    if (signInError) {
      setError("เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setLoading(false);
    }
  };

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();
    setLoading(true);
    const supabase = createClient();
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: getRedirectUrl() } });

    if (result.error) {
      setError(mode === "login" ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : "สมัครสมาชิกไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองใหม่");
      setLoading(false);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("สมัครสมาชิกแล้ว กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี");
      setLoading(false);
      return;
    }

    window.location.assign("/");
  };

  const requestPasswordReset = async () => {
    clearFeedback();
    if (!email.trim()) {
      setError("กรุณากรอกอีเมลก่อนขอเปลี่ยนรหัสผ่าน");
      return;
    }
    setLoading(true);
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    setMessage(resetError ? "ส่งลิงก์ไม่สำเร็จ กรุณาตรวจสอบอีเมลอีกครั้ง" : "ส่งลิงก์เปลี่ยนรหัสผ่านไปที่อีเมลแล้ว");
    if (resetError) setError("ส่งลิงก์ไม่สำเร็จ กรุณาตรวจสอบอีเมลอีกครั้ง");
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <section className="slide-up w-full max-w-md bg-white rounded-[22px] shadow-cardLg border border-[#e8eaf0] overflow-hidden" aria-labelledby="login-title">
        <div className="px-8 pt-10 pb-8 text-center text-white" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed 60%,#6d28d9)" }}>
          <div className="text-3xl mb-2" aria-hidden="true">คลังข้อสอบ</div>
          <h1 id="login-title" className="font-extrabold text-lg">คลังข้อสอบจริง ก.พ.</h1>
          <p className="text-sm opacity-75 mt-1">E-EXAM 2569</p>
        </div>

        <div className="p-8 flex flex-col gap-5">
          <p className="text-sm text-gray-500 text-center leading-relaxed">ฝึกทำข้อสอบจริง ก.พ. พร้อมเฉลยละเอียด และติดตามความก้าวหน้าของคุณ</p>

          <button type="button" onClick={signInWithGoogle} disabled={loading} className="flex items-center justify-center gap-3 w-full py-3 rounded-xl border border-gray-300 bg-white font-semibold text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-60">
            <span className="font-bold text-base" aria-hidden="true">G</span>
            {loading ? "กำลังดำเนินการ..." : "ดำเนินการต่อด้วย Google"}
          </button>

          <div className="flex items-center gap-3 text-xs text-gray-400"><span className="h-px flex-1 bg-gray-200" /><span>หรือใช้อีเมล</span><span className="h-px flex-1 bg-gray-200" /></div>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1" role="tablist" aria-label="ประเภทการใช้งาน">
            <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => { setMode("login"); clearFeedback(); }} className={`rounded-lg py-2 text-sm font-semibold transition ${mode === "login" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"}`}>เข้าสู่ระบบ</button>
            <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => { setMode("signup"); clearFeedback(); }} className={`rounded-lg py-2 text-sm font-semibold transition ${mode === "signup" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"}`}>สมัครสมาชิก</button>
          </div>

          <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
            <label className="text-sm font-semibold text-gray-700" htmlFor="email">อีเมล</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-indigo-500" />
            <label className="text-sm font-semibold text-gray-700" htmlFor="password">รหัสผ่าน</label>
            <input id="password" type="password" required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-indigo-500" />
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60">{mode === "login" ? "เข้าสู่ระบบ" : "สร้างบัญชี"}</button>
          </form>

          {mode === "login" && <button type="button" onClick={requestPasswordReset} disabled={loading} className="text-sm font-semibold text-indigo-600 hover:underline disabled:opacity-60">ลืมรหัสผ่าน?</button>}
          {error && <p role="alert" className="text-xs text-red-600 text-center">{error}</p>}
          {message && <p role="status" className="text-xs text-emerald-600 text-center">{message}</p>}
          <p className="text-[11px] text-gray-400 text-center leading-relaxed">การใช้งานถือว่าคุณยอมรับข้อกำหนดและเงื่อนไขการใช้งาน</p>
        </div>
      </section>
    </main>
  );
}

