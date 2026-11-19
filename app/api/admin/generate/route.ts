// Server-only AI generation endpoint. API keys never leave this route.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Provider = "auto" | "gemini" | "claude";
type SourceMode = "article" | "topic" | "google_sheet";

type GeneratedQuestion = {
  text: string;
  choices: string[];
  correct_index: number;
  explanation: string;
};

const QUESTION_COUNT = 5;
const MAX_SOURCE_LENGTH = 12_000;

function buildPrompt(subcategoryName: string, sourceMode: SourceMode, sourceInput: string) {
  return `คุณเป็นผู้ออกข้อสอบ ก.พ. (สำนักงาน ก.พ. ประเทศไทย) หมวดวิชา "${subcategoryName}"
โหมดแหล่งที่มา: ${sourceMode}
เนื้อหา/หัวข้ออ้างอิง:
<source>
${sourceInput}
</source>

จงสร้างข้อสอบปรนัย 4 ตัวเลือก จำนวน ${QUESTION_COUNT} ข้อ
ต้องยึดข้อเท็จจริงจากเนื้อหาที่ให้มา ไม่แต่งมาตรา กฎหมาย ตัวเลข หรือแหล่งอ้างอิงขึ้นเอง
หากข้อมูลไม่พอให้ออกข้อสอบที่ถูกต้อง ให้สร้างโจทย์จากหลักการทั่วไปของหมวดวิชานี้โดยไม่อ้างข้อมูลที่ไม่มีในแหล่ง
ตอบเป็น JSON array เท่านั้น ห้ามมีข้อความหรือ markdown นอก JSON
โครงสร้างแต่ละข้อ:
{"text":"โจทย์คำถาม","choices":["ตัวเลือก ก","ตัวเลือก ข","ตัวเลือก ค","ตัวเลือก ง"],"correct_index":0,"explanation":"คำอธิบายเฉลยและเหตุผล"}
correct_index ต้องเป็นจำนวนเต็ม 0-3 และต้องตรงกับตัวเลือกที่ถูกต้อง`;
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
      }),
      signal: AbortSignal.timeout(60_000),
    }
  );

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Gemini API error (${res.status})`);
  }

  return data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("") ?? "";
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
      model: "claude-sonnet-5",
      max_tokens: 6000,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Claude API error (${res.status})`);
  }

  return data?.content?.map((part: { text?: string }) => part.text ?? "").join("") ?? "";
}

function parseGeneratedQuestions(rawText: string): GeneratedQuestion[] {
  const cleaned = rawText.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  const parsed: unknown = JSON.parse(cleaned);

  if (!Array.isArray(parsed) || parsed.length !== QUESTION_COUNT) {
    throw new Error(`AI ต้องส่งข้อสอบกลับมา exactly ${QUESTION_COUNT} ข้อ`);
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`ข้อที่ ${index + 1} มีรูปแบบไม่ถูกต้อง`);
    }

    const question = item as Partial<GeneratedQuestion>;
    if (typeof question.text !== "string" || !question.text.trim()) {
      throw new Error(`ข้อที่ ${index + 1} ไม่มีข้อความโจทย์`);
    }
    if (
      !Array.isArray(question.choices) ||
      question.choices.length !== 4 ||
      question.choices.some((choice) => typeof choice !== "string" || !choice.trim())
    ) {
      throw new Error(`ข้อที่ ${index + 1} ต้องมีตัวเลือกครบ 4 ตัวเลือก`);
    }
    if (
      !Number.isInteger(question.correct_index) ||
      (question.correct_index as number) < 0 ||
      (question.correct_index as number) > 3
    ) {
      throw new Error(`ข้อที่ ${index + 1} มี correct_index ไม่ถูกต้อง`);
    }
    if (typeof question.explanation !== "string" || !question.explanation.trim()) {
      throw new Error(`ข้อที่ ${index + 1} ไม่มีคำอธิบายเฉลย`);
    }

    return {
      text: question.text.trim(),
      choices: question.choices.map((choice) => choice.trim()),
      correct_index: question.correct_index as number,
      explanation: question.explanation.trim(),
    };
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  // Defense in depth: this route is admin-only even before database RLS checks.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ใช้งานเครื่องมือสร้างข้อสอบ" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลคำขอไม่ถูกต้อง" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "ไม่พบข้อมูลคำขอ" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const subcategoryId = typeof input.subcategoryId === "string" ? input.subcategoryId.trim() : "";
  const sourceInput = typeof input.sourceInput === "string" ? input.sourceInput.trim() : "";
  const sourceMode = input.sourceMode as SourceMode;
  const provider = input.provider as Provider;

  if (!subcategoryId || !sourceInput) {
    return NextResponse.json({ error: "กรุณาเลือกหมวดวิชาและกรอกเนื้อหา/หัวข้อ" }, { status: 400 });
  }
  if (sourceInput.length > MAX_SOURCE_LENGTH) {
    return NextResponse.json({ error: `เนื้อหาต้องไม่เกิน ${MAX_SOURCE_LENGTH.toLocaleString("th-TH")} ตัวอักษร` }, { status: 413 });
  }
  if (!["article", "topic", "google_sheet"].includes(sourceMode)) {
    return NextResponse.json({ error: "รูปแบบแหล่งข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  if (!["auto", "gemini", "claude"].includes(provider)) {
    return NextResponse.json({ error: "AI Provider ไม่ถูกต้อง" }, { status: 400 });
  }

  // Do not pretend a Sheet URL is Sheet content. Google Sheets ingestion needs
  // a dedicated, authorized integration and is intentionally not simulated.
  if (sourceMode === "google_sheet") {
    return NextResponse.json(
      { error: "การอ่าน Google Sheet ยังไม่เชื่อมต่อ กรุณาใช้โหมดบทความหรือหัวข้อในขณะนี้" },
      { status: 501 }
    );
  }

  const { data: subcategory, error: categoryError } = await supabase
    .from("subcategories")
    .select("id, name")
    .eq("id", subcategoryId)
    .single();

  if (categoryError || !subcategory) {
    return NextResponse.json({ error: "ไม่พบหมวดวิชาที่เลือก" }, { status: 400 });
  }

  const { data: logRow, error: logError } = await supabase
    .from("ai_generation_logs")
    .insert({
      requested_by: user.id,
      subcategory_id: subcategoryId,
      source_mode: sourceMode,
      source_input: sourceInput,
      provider,
      status: "generating",
    })
    .select("id")
    .single();

  if (logError || !logRow) {
    return NextResponse.json({ error: logError?.message ?? "สร้างประวัติการทำงานไม่สำเร็จ" }, { status: 500 });
  }

  try {
    const { data: keysData, error: keysError } = await supabase.rpc("get_ai_keys_internal");
    if (keysError) throw new Error(keysError.message);
    const keys = Array.isArray(keysData) ? keysData[0] : keysData;

    const providerUsed: "gemini" | "claude" =
      provider === "gemini"
        ? "gemini"
        : provider === "claude"
          ? "claude"
          : keys?.gemini_key
            ? "gemini"
            : "claude";

    const apiKey = providerUsed === "gemini" ? keys?.gemini_key : keys?.claude_key;
    if (!apiKey) {
      throw new Error(`ยังไม่ได้ตั้งค่า API Key ของ ${providerUsed === "gemini" ? "Gemini" : "Claude"} ในแท็บตั้งค่า`);
    }

    const prompt = buildPrompt(subcategory.name, sourceMode, sourceInput);
    const rawText = providerUsed === "gemini"
      ? await callGemini(apiKey, prompt)
      : await callClaude(apiKey, prompt);
    const questions = parseGeneratedQuestions(rawText);

    const { error: updateError } = await supabase
      .from("ai_generation_logs")
      .update({
        status: "preview",
        provider_used: providerUsed,
        prompt_used: prompt,
        raw_response: { text: rawText },
        generated_questions: questions,
      })
      .eq("id", logRow.id);

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ logId: logRow.id, questions, providerUsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
    await supabase
      .from("ai_generation_logs")
      .update({ status: "failed", error_message: message.slice(0, 1000) })
      .eq("id", logRow.id);

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
