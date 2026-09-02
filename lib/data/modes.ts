// นิยาม 3 โหมดจริงตามที่ฐานข้อมูลรองรับ (exam_attempts.mode CHECK constraint)
export type ModeKey = "full100" | "category" | "year";

export const MODES: {
  key: ModeKey;
  icon: string;
  title: string;
  description: string;
  accent: string;
}[] = [
  {
    key: "full100",
    icon: "🏆",
    title: "จำลองสนามจริง (100 ข้อ)",
    description: "สุ่มข้อสอบเต็มรูปแบบตามจำนวนข้อที่ตั้งค่าไว้ จับเวลาเหมือนสนามสอบจริง",
    accent: "#1d4ed8",
  },
  {
    key: "category",
    icon: "🎯",
    title: "ติวเจาะรายหมวด",
    description: "เลือกหมวดวิชาที่อยากฝึก ระบบจะสุ่มข้อที่ยังไม่เคยทำมาให้ก่อน",
    accent: "#b45309",
  },
  {
    key: "year",
    icon: "📚",
    title: "คลังข้อสอบเก่า (ตามรอบ/ปี)",
    description: "เลือกรอบสอบหรือปีที่ต้องการ ฝึกทำข้อสอบจริงจากรอบนั้น ๆ",
    accent: "#0f766e",
  },
];

export function getMode(key: string | null) {
  return MODES.find((m) => m.key === key) ?? null;
}
