"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsTab() {
  const supabase = createClient();
  const [provider, setProvider] = useState<"auto" | "gemini" | "claude">("auto");
  const [hasGemini, setHasGemini] = useState(false);
  const [hasClaude, setHasClaude] = useState(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [claudeKey, setClaudeKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingAi, setSavingAi] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
<<<<<<< HEAD
    supabase.rpc("get_ai_settings").then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setProvider(row.ai_provider);
        setHasGemini(row.has_gemini_key);
        setHasClaude(row.has_claude_key);
      }
      setLoading(false);
    });
=======
    // RLS: system_config_select อนุญาต admin อ่านแถว key='secrets' ได้โดยตรง (ไม่ต้องใช้ RPC)
    supabase
      .from("system_config")
      .select("ai_provider, claude_api_key, gemini_api_key")
      .eq("key", "secrets")
      .single()
      .then(({ data }) => {
        if (data) {
          setProvider((data.ai_provider as "auto" | "gemini" | "claude") ?? "auto");
          setHasGemini(!!data.gemini_api_key);
          setHasClaude(!!data.claude_api_key);
        }
        setLoading(false);
      });
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveAiSettings = async () => {
    setSavingAi(true);
    setError(null);
    setMsg(null);
<<<<<<< HEAD
    const { error: rpcError } = await supabase.rpc("update_ai_settings", {
      p_provider: provider,
      p_gemini_key: geminiKey || null,
      p_claude_key: claudeKey || null,
    });
    setSavingAi(false);
    if (rpcError) {
      setError(rpcError.message);
=======
    const updatePayload: Record<string, string> = { ai_provider: provider };
    if (geminiKey) updatePayload.gemini_api_key = geminiKey;
    if (claudeKey) updatePayload.claude_api_key = claudeKey;

    const { error: updateError } = await supabase.from("system_config").update(updatePayload).eq("key", "secrets");
    setSavingAi(false);
    if (updateError) {
      setError(updateError.message);
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
      return;
    }
    setMsg("✅ บันทึกการตั้งค่า AI เรียบร้อย");
    if (geminiKey) setHasGemini(true);
    if (claudeKey) setHasClaude(true);
    setGeminiKey("");
    setClaudeKey("");
  };

  const changePassword = async () => {
    setSavingPw(true);
    setError(null);
    setMsg(null);
    const { error: rpcError } = await supabase.rpc("update_admin_password", { p_new_password: newPassword });
    setSavingPw(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setMsg("✅ เปลี่ยนรหัสผ่านแอดมินเรียบร้อย");
    setNewPassword("");
  };

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">กำลังโหลด...</div>;

  return (
    <div className="flex flex-col gap-5">
      {msg && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">{msg}</p>}
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="font-extrabold text-gray-900 text-sm mb-3.5">🤖 ตั้งค่า AI API Keys</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
          <div>
            <div className="text-xs font-bold text-gray-500 mb-1.5">
              ✨ Gemini API Key {hasGemini && <span className="text-green-600">(ตั้งค่าแล้ว)</span>}
            </div>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder={hasGemini ? "•••••••• (เว้นว่างถ้าไม่เปลี่ยน)" : "AIza..."}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 mb-1.5">
              🧠 Claude API Key {hasClaude && <span className="text-green-600">(ตั้งค่าแล้ว)</span>}
            </div>
            <input
              type="password"
              value={claudeKey}
              onChange={(e) => setClaudeKey(e.target.value)}
              placeholder={hasClaude ? "•••••••• (เว้นว่างถ้าไม่เปลี่ยน)" : "sk-ant-..."}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs font-bold text-gray-500 mb-1.5">AI Provider ที่ใช้งาน</div>
          <div className="flex gap-2">
            {(["auto", "gemini", "claude"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className="px-3.5 py-1.5 rounded-full text-sm font-semibold"
                style={{ background: provider === p ? "#4f46e5" : "#f3f4f6", color: provider === p ? "#fff" : "#6b7280" }}
              >
                {p === "auto" ? "🔀 Auto (แนะนำ)" : p === "gemini" ? "✨ Gemini" : "🧠 Claude"}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={saveAiSettings}
          disabled={savingAi}
          className="px-5 py-2.5 bg-indigo rounded-xl text-white font-bold text-sm disabled:opacity-60"
        >
          {savingAi ? "กำลังบันทึก..." : "💾 บันทึกการตั้งค่า AI"}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="font-extrabold text-gray-900 text-sm mb-3.5">🔑 เปลี่ยนรหัสผ่าน Admin Panel</div>
        <div className="flex gap-2.5 flex-wrap">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <button
            onClick={changePassword}
            disabled={savingPw || newPassword.length < 6}
            className="px-5 py-2 bg-gray-900 rounded-lg text-white text-sm font-bold disabled:opacity-40"
          >
            {savingPw ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
          </button>
        </div>
      </div>
    </div>
  );
}
