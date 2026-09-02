import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TopNav from "@/components/TopNav";
import TermsGate from "@/components/TermsGate";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware ควรกันไว้แล้ว แต่เช็คซ้ำเผื่อ edge case (เช่น cookie หมดอายุระหว่างทาง)
  if (!user) redirect("/login");

  // หา terms version ที่ active อยู่ล่าสุด
  const { data: activeTerms } = await supabase
    .from("terms_versions")
    .select("id, content")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let needsAcceptance = false;
  if (activeTerms) {
    const { data: acceptance } = await supabase
      .from("terms_acceptance")
      .select("id")
      .eq("user_id", user.id)
      .eq("terms_version_id", activeTerms.id)
      .maybeSingle();
    needsAcceptance = !acceptance;
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="max-w-[1100px] mx-auto px-4">{children}</main>
      {needsAcceptance && activeTerms && (
        <TermsGate termsVersionId={activeTerms.id} content={activeTerms.content} />
      )}
    </div>
  );
}
