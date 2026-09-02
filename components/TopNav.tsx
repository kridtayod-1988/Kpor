import { createClient } from "@/lib/supabase/server";

export default async function TopNav() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = user?.email ?? "ผู้ใช้";
  let role: string = "user";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, role")
      .eq("id", user.id)
      .single();
    if (profile?.display_name) displayName = profile.display_name;
    if (profile?.role) role = profile.role;
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-5 py-2.5 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <div className="font-extrabold text-gray-900 text-[1.04rem] tracking-tight flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo inline-block" />
        คลังข้อสอบ ก.พ. E-EXAM 2569
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-500 text-sm hidden sm:inline">👤 {displayName}</span>
        {role === "admin" && (
          <a
            href="/admin"
            className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm font-bold"
          >
            ⚙️ Admin
          </a>
        )}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm"
          >
            ออกจากระบบ
          </button>
        </form>
      </div>
    </nav>
  );
}
