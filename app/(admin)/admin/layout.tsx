import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import "@/app/globals.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // ชั้นแรก: ต้องมี role='admin' ในฐานข้อมูลก่อน (ตั้งค่าโดย superadmin ผ่าน SQL โดยตรง)
  // ชั้นสอง (ใน page.tsx): ต้องผ่าน AdminGate ด้วยรหัสผ่านแอดมินอีกชั้นหนึ่ง
  if (profile?.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[1200px] mx-auto px-4 py-4">{children}</div>
    </div>
  );
}
