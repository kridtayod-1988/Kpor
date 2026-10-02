"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (password !== confirmPassword) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }
    setLoading(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError("เปลี่ยนรหัสผ่านไม่สำเร็จ ลิงก์อาจหมดอายุแล้ว");
      return;
    }
    setMessage("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กำลังกลับไปหน้าหลัก...");
    window.setTimeout(() => window.location.assign("/"), 1200);
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <section className="slide-up w-full max-w-md rounded-[22px] border border-[#e8eaf0] bg-white p-8 shadow-cardLg" aria-labelledby="reset-title">
        <h1 id="reset-title" className="text-xl font-extrabold text-gray-900">ตั้งรหัสผ่านใหม่</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">กำหนดรหัสผ่านใหม่สำหรับบัญชีของคุณ</p>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <label className="text-sm font-semibold text-gray-700" htmlFor="new-password">รหัสผ่านใหม่</label>
          <input id="new-password" type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-indigo-500" />
          <label className="text-sm font-semibold text-gray-700" htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</label>
          <input id="confirm-password" type="password" required minLength={6} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-indigo-500" />
          <button type="submit" disabled={loading} className="mt-2 w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{loading ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}</button>
        </form>
        {error && <p role="alert" className="mt-4 text-center text-xs text-red-600">{error}</p>}
        {message && <p role="status" className="mt-4 text-center text-xs text-emerald-600">{message}</p>}
      </section>
    </main>
  );
}
