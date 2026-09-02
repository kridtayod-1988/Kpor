// Route Handler: เรียก Gemini/Claude เพื่อสร้างข้อสอบ — รันฝั่ง server เท่านั้น
<<<<<<< HEAD
// API key ไม่ถูกส่งกลับไปยัง client เด็ดขาด (ดึงผ่าน RPC get_ai_keys_internal ที่ตรวจ is_admin() ภายในตัวเอง)
=======
// อ่าน API key จากตาราง system_config (แถว key='secrets') ผ่าน client ที่ผูกกับ session ของแอดมิน
// RLS อนุญาตให้ admin อ่านแถวนี้ได้โดยตรงอยู่แล้ว (system_config_select: key='public' OR is_admin())
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type GeneratedQuestion = {
<<<<<<< HEAD
  text: string;
  choices: string[];
  correct_index: number;
  explanation: string;
};

function buildPrompt(subcategoryName: string, sourceMode: string, sourceInput: string) {
  return `คุณเป็นผู้ออกข้อสอบ ก.พ. (สำนักงาน ก.พ. ประเทศไทย) หมวดวิชา "${subcategoryName}"
=======
  question_text: string;
  options: string[];
  correct_answer_index: number;
  explanation: string;
};

function buildPrompt(categoryName: string, sourceMode: string, sourceInput: string) {
  return `คุณเป็นผู้ออกข้อสอบ ก.พ. (สำนักงาน ก.พ. ประเทศไทย) หมวดวิชา "${categoryName}"
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
โหมดแหล่งที่มา: ${sourceMode}
เนื้อหา/หัวข้ออ้างอิง: ${sourceInput}

จงสร้างข้อสอบปรนัย 4 ตัวเลือก จำนวน 5 ข้อ ในรูปแบบ JSON array เท่านั้น ห้ามมีข้อความอื่นนอกเหนือจาก JSON
แต่ละข้อมีโครงสร้างดังนี้:
<<<<<<< HEAD
{"text": "โจทย์คำถาม", "choices": ["ตัวเลือกก","ตัวเลือกข","ตัวเลือกค","ตัวเลือกง"], "correct_index": 0, "explanation": "คำอธิบายเฉลยแบบ step-by-step"}

correct_index เป็นเลข 0-3 ตรงกับตำแหน่งใน choices ตอบเป็น JSON array เดียว ห้ามใส่ markdown code fence`;
=======
{"question_text": "โจทย์คำถาม", "options": ["ตัวเลือกก","ตัวเลือกข","ตัวเลือกค","ตัวเลือกง"], "correct_answer_index": 0, "explanation": "คำอธิบายเฉลยแบบ step-by-step"}

correct_answer_index เป็นเลข 0-3 ตรงกับตำแหน่งใน options ตอบเป็น JSON array เดียว ห้ามใส่ markdown code fence`;
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Gemini API error");
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callClaude(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Claude API error");
  return data?.content?.map((c: { text?: string }) => c.text ?? "").join("") ?? "";
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });

  const body = await request.json();
<<<<<<< HEAD
  const { subcategoryId, subcategoryName, sourceMode, sourceInput, provider } = body as {
    subcategoryId: string;
    subcategoryName: string;
=======
  const { categoryId, categoryName, sourceMode, sourceInput, provider } = body as {
    categoryId: string;
    categoryName: string;
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
    sourceMode: string;
    sourceInput: string;
    provider: "auto" | "gemini" | "claude";
  };

<<<<<<< HEAD
  if (!subcategoryId || !sourceInput) {
    return NextResponse.json({ error: "กรุณาเลือกหมวดวิชาและกรอกเนื้อหา/หัวข้อ" }, { status: 400 });
  }

  // สร้าง log เริ่มต้น
=======
  if (!categoryId || !sourceInput) {
    return NextResponse.json({ error: "กรุณาเลือกหมวดวิชาและกรอกเนื้อหา/หัวข้อ" }, { status: 400 });
  }

>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
  const { data: logRow, error: logError } = await supabase
    .from("ai_generation_logs")
    .insert({
      requested_by: user.id,
<<<<<<< HEAD
      subcategory_id: subcategoryId,
      source_mode: sourceMode,
      source_input: sourceInput,
      provider,
=======
      category_id: categoryId,
      source_mode: sourceMode,
      source_input: sourceInput,
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
      status: "generating",
    })
    .select("id")
    .single();

  if (logError || !logRow) {
    return NextResponse.json({ error: logError?.message ?? "สร้าง log ไม่สำเร็จ" }, { status: 500 });
  }

  try {
<<<<<<< HEAD
    const { data: keysData, error: keysError } = await supabase.rpc("get_ai_keys_internal");
    if (keysError) throw new Error(keysError.message);
    const keys = Array.isArray(keysData) ? keysData[0] : keysData;
=======
    // admin เท่านั้นที่ RLS อนุญาตให้อ่านแถว key='secrets' ได้ (ดู policy system_config_select)
    const { data: secrets, error: secretsError } = await supabase
      .from("system_config")
      .select("ai_provider, gemini_api_key, claude_api_key")
      .eq("key", "secrets")
      .single();
    if (secretsError) throw new Error(secretsError.message);
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc

    let providerUsed: "gemini" | "claude";
    if (provider === "gemini") providerUsed = "gemini";
    else if (provider === "claude") providerUsed = "claude";
<<<<<<< HEAD
    else providerUsed = keys?.gemini_key ? "gemini" : "claude";

    const apiKey = providerUsed === "gemini" ? keys?.gemini_key : keys?.claude_key;
    if (!apiKey) {
      throw new Error(
        `ยังไม่ได้ตั้งค่า API Key ของ ${providerUsed === "gemini" ? "Gemini" : "Claude"} ในแท็บตั้งค่า`
      );
    }

    const prompt = buildPrompt(subcategoryName, sourceMode, sourceInput);
=======
    else providerUsed = secrets?.gemini_api_key ? "gemini" : "claude";

    const apiKey = providerUsed === "gemini" ? secrets?.gemini_api_key : secrets?.claude_api_key;
    if (!apiKey) {
      throw new Error(`ยังไม่ได้ตั้งค่า API Key ของ ${providerUsed === "gemini" ? "Gemini" : "Claude"} ในแท็บตั้งค่า`);
    }

    const prompt = buildPrompt(categoryName, sourceMode, sourceInput);
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
    const rawText = providerUsed === "gemini" ? await callGemini(apiKey, prompt) : await callClaude(apiKey, prompt);

    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed: GeneratedQuestion[] = JSON.parse(cleaned);

    await supabase
      .from("ai_generation_logs")
<<<<<<< HEAD
      .update({
        status: "preview",
        provider_used: providerUsed,
        prompt_used: prompt,
        generated_questions: parsed,
      })
=======
      .update({ status: "preview", provider_used: providerUsed, generated_questions: parsed })
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
      .eq("id", logRow.id);

    return NextResponse.json({ logId: logRow.id, questions: parsed, providerUsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
<<<<<<< HEAD
    await supabase
      .from("ai_generation_logs")
      .update({ status: "failed", error_message: message })
      .eq("id", logRow.id);
=======
    await supabase.from("ai_generation_logs").update({ status: "failed", error_message: message }).eq("id", logRow.id);
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
