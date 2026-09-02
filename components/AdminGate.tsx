"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SESSION_KEY = "kpor_admin_unlocked";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [checkedStorage, setCheckedStorage] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // ปลดล็อกอัตโนมัติถ้าเคยใส่รหัสผ่านถูกแล้วใน tab นี้ (หายไปเมื่อปิดแท็บ/เบราว์เซอร์)
    if (typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "1") {
      setUnlocked(true);
    }
    setCheckedStorage(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("verify_admin_password", {
      p_password: password,
    });
    setLoading(false);

    if (rpcError || data !== true) {
      setError("รหัสผ่านไม่ถูกต้อง");
      return;
    }
    sessionStorage.setItem(SESSION_KEY, "1");
    setUnlocked(true);
  };

  if (!checkedStorage) return null;

  if (!unlocked) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <form
          onSubmit={handleSubmit}
          className="slide-up w-full max-w-xs bg-white rounded-2xl border border-gray-200 shadow-cardLg p-6 flex flex-col gap-4"
        >
          <div className="text-center">
            <div className="text-3xl mb-1.5">🔒</div>
            <div className="font-extrabold text-gray-900">เข้าสู่ Admin Panel</div>
            <div className="text-xs text-gray-400 mt-1">กรุณากรอกรหัสผ่านผู้ดูแลระบบ</div>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="รหัสผ่าน Admin"
            autoFocus
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo"
          />
          {error && <p className="text-xs text-red-600 text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-2.5 bg-indigo rounded-xl text-white font-bold text-sm disabled:opacity-50"
          >
            {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
