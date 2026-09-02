import { createClient } from "@/lib/supabase/server";
import ModeCard from "@/components/ModeCard";
import { MODES } from "@/lib/data/modes";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = "เพื่อนผู้เตรียมสอบ";
  let totalAttempts = 0;
  let bestScore = 0;
  let totalExp = 0;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, total_attempts, best_score, total_exp")
      .eq("id", user.id)
      .single();
    if (profile) {
      if (profile.display_name) displayName = profile.display_name;
      totalAttempts = profile.total_attempts;
      bestScore = profile.best_score;
      totalExp = profile.total_exp;
    }
  }

  return (
    <div className="py-5 pb-12">
      {/* Welcome hero */}
      <div
        className="rounded-[20px] px-6 py-5 mb-5 flex items-center justify-between shadow-[0_8px_28px_rgba(79,70,229,.26)] flex-wrap gap-3"
        style={{ background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 60%,#6d28d9 100%)" }}
      >
        <div>
          <div className="text-lg font-extrabold text-white mb-0.5">สวัสดี, {displayName} 👋</div>
          <div className="text-[.79rem] text-white/70">เลือก Mode การฝึกทำข้อสอบด้านล่าง</div>
        </div>
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
        {MODES.map((mode) => (
          <ModeCard key={mode.key} mode={mode} />
        ))}
      </div>
    </div>
  );
}
