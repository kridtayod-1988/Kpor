"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ProfileRow = {
  id: string;
  display_name: string | null;
<<<<<<< HEAD
  role: string;
  xp: number;
  level: number;
=======
  email: string | null;
  role: string;
  total_exp: number;
  best_score: number;
  total_attempts: number;
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
  created_at: string;
};

export default function UsersTab() {
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
<<<<<<< HEAD
      .select("id, display_name, role, xp, level, created_at")
      .order("xp", { ascending: false })
=======
      .select("id, display_name, email, role, total_exp, best_score, total_attempts, created_at")
      .order("total_exp", { ascending: false })
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
      .then(({ data }) => {
        setUsers((data as ProfileRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">กำลังโหลด...</div>;

  return (
<<<<<<< HEAD
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
=======
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden overflow-x-auto">
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-500 text-xs uppercase">
            <th className="px-4 py-2.5 font-bold">ผู้ใช้</th>
            <th className="px-4 py-2.5 font-bold">สิทธิ์</th>
<<<<<<< HEAD
            <th className="px-4 py-2.5 font-bold">Level</th>
            <th className="px-4 py-2.5 font-bold">XP</th>
=======
            <th className="px-4 py-2.5 font-bold">คะแนนสูงสุด</th>
            <th className="px-4 py-2.5 font-bold">EXP</th>
            <th className="px-4 py-2.5 font-bold">จำนวนครั้งที่สอบ</th>
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
            <th className="px-4 py-2.5 font-bold">สมัครเมื่อ</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-gray-100 last:border-0">
<<<<<<< HEAD
              <td className="px-4 py-2.5 font-semibold text-gray-900">{u.display_name ?? "(ไม่ระบุชื่อ)"}</td>
=======
              <td className="px-4 py-2.5">
                <div className="font-semibold text-gray-900">{u.display_name ?? "(ไม่ระบุชื่อ)"}</div>
                <div className="text-xs text-gray-400">{u.email}</div>
              </td>
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
              <td className="px-4 py-2.5">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    u.role === "admin" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {u.role}
                </span>
              </td>
<<<<<<< HEAD
              <td className="px-4 py-2.5">
                <span className="font-mono font-bold text-indigo">Lv.{u.level}</span>
              </td>
              <td className="px-4 py-2.5 font-mono text-gray-600">{u.xp} XP</td>
=======
              <td className="px-4 py-2.5 font-mono font-bold text-indigo">{u.best_score}</td>
              <td className="px-4 py-2.5 font-mono text-gray-600">{u.total_exp} XP</td>
              <td className="px-4 py-2.5 font-mono text-gray-600">{u.total_attempts}</td>
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
              <td className="px-4 py-2.5 text-gray-400 text-xs">
                {new Date(u.created_at).toLocaleDateString("th-TH")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">ยังไม่มีผู้ใช้งาน</div>}
    </div>
  );
}
