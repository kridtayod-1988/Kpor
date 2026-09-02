import Link from "next/link";
import type { ModeKey } from "@/lib/data/modes";

export default function ModeCard({
  mode,
}: {
  mode: { key: ModeKey; icon: string; title: string; description: string; accent: string };
}) {
  return (
    <Link
      href={`/exam-sets?mode=${mode.key}`}
      className="group block bg-white rounded-[18px] border border-[#e8eaf0] shadow-card hover:shadow-cardLg hover:-translate-y-0.5 transition-all overflow-hidden"
    >
      <div
        className="px-5 pt-[18px] pb-3.5 border-b border-[#e8eaf0]"
        style={{ borderTop: `3.5px solid ${mode.accent}` }}
      >
        <div className="text-[1.8rem] mb-2">{mode.icon}</div>
        <div className="font-extrabold text-gray-900 text-[.97rem]">{mode.title}</div>
        <div className="text-[.8rem] text-gray-500 mt-1 leading-relaxed">{mode.description}</div>
      </div>
      <div className="px-5 py-3.5 flex items-center justify-between">
        <span className="text-sm font-bold" style={{ color: mode.accent }}>
<<<<<<< HEAD
          ดูรายชื่อชุดข้อสอบ (หน้าที่ 2)
=======
          ตั้งค่าและเริ่มทำข้อสอบ →
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
        </span>
        <span
          className="transition-transform group-hover:translate-x-1"
          style={{ color: mode.accent }}
        >
          →
        </span>
      </div>
    </Link>
  );
}
