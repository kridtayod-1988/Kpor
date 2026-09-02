import { createClient } from "@/lib/supabase/server";
import ModeCard from "@/components/ModeCard";
import { MODES } from "@/lib/data/modes";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = "เพื่อนผู้เตรียมสอบ";
<<<<<<< HEAD
  let attemptCount = 0;
=======
  let totalAttempts = 0;
  let bestScore = 0;
  let totalExp = 0;
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
<<<<<<< HEAD
      .select("display_name")
      .eq("id", user.id)
      .single();
    if (profile?.display_name) displayName = profile.display_name;

    const { count } = await supabase
      .from("user_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("finished_at", "is", null);
    attemptCount = count ?? 0;
=======
      .select("display_name, total_attempts, best_score, total_exp")
      .eq("id", user.id)
      .single();
    if (profile) {
      if (profile.display_name) displayName = profile.display_name;
      totalAttempts = profile.total_attempts;
      bestScore = profile.best_score;
      totalExp = profile.total_exp;
    }
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
  }

  return (
    <div className="py-5 pb-12">
      {/* Welcome hero */}
      <div
<<<<<<< HEAD
        className="rounded-[20px] px-6 py-5 mb-5 flex items-center justify-between shadow-[0_8px_28px_rgba(79,70,229,.26)]"
=======
        className="rounded-[20px] px-6 py-5 mb-5 flex items-center justify-between shadow-[0_8px_28px_rgba(79,70,229,.26)] flex-wrap gap-3"
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
        style={{ background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 60%,#6d28d9 100%)" }}
      >
        <div>
          <div className="text-lg font-extrabold text-white mb-0.5">สวัสดี, {displayName} 👋</div>
          <div className="text-[.79rem] text-white/70">เลือก Mode การฝึกทำข้อสอบด้านล่าง</div>
        </div>
<<<<<<< HEAD
        <div className="text-right">
          <div className="text-3xl font-black text-white font-mono leading-none">{attemptCount}</div>
          <div className="text-[.71rem] text-white/60 mt-0.5">ครั้งที่สอบแล้ว</div>
        </div>
      </div>

      {/* GPA3 hero banner */}
      <a
        href="/exam-sets?mode=archive&set=GPA3001"
        className="block rounded-[18px] px-5 py-4 mb-5 border-2 hover:-translate-y-0.5 transition-transform"
        style={{
          background: "linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 50%,#1e40af 100%)",
          borderColor: "rgba(147,197,253,.3)",
        }}
      >
        <div className="flex items-center gap-3.5 flex-wrap">
          <div className="text-3xl">🏅</div>
          <div className="flex-1 min-w-[220px]">
            <div className="font-black text-white text-base mb-1">
              จำลองสนามจริง ก.พ. ระดับ 3 — 100 ข้อ · 200 คะแนน · 180 นาที
            </div>
            <div className="text-white/70 text-xs">เกณฑ์ผ่านแยกส่วน 3 หมวดวิชา — ต้องผ่านทุกหมวดพร้อมกัน</div>
          </div>
          <div className="rounded-xl px-4 py-2 text-white font-bold text-sm bg-white/15 border border-white/25">
            ▶ เริ่มสอบ
          </div>
        </div>
      </a>

      {/* 4 mode cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
=======
        <div className="flex gap-4">
          <div className="text-right">
            <div className="text-2xl font-black text-white font-mono leading-none">{totalAttempts}</div>
            <div className="text-[.68rem] text-white/60 mt-0.5">ครั้งที่สอบแล้ว</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-white font-mono leading-none">{bestScore}</div>
            <div className="text-[.68rem] text-white/60 mt-0.5">คะแนนสูงสุด</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-white font-mono leading-none">{totalExp}</div>
            <div className="text-[.68rem] text-white/60 mt-0.5">EXP สะสม</div>
          </div>
        </div>
      </div>

      {/* 3 mode cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
        {MODES.map((mode) => (
          <ModeCard key={mode.key} mode={mode} />
        ))}
      </div>
    </div>
  );
}
