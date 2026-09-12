// นิยาม 4 โหมดของหน้าหลัก — ใช้ทั้งหน้า 1 (การ์ดเลือกโหมด) และหน้า 2 (ชิปโหมดด่วน)
export type ModeKey = "archive" | "practice" | "category" | "workshop";

export const MODES: {
  key: ModeKey;
  icon: string;
  title: string;
  description: string;
  accent: string; // ใช้ควบคุม border-top / badge ของการ์ด
}[] = [
  {
    key: "archive",
    icon: "📚",
    title: "คลังข้อสอบเก่า",
    description: "ข้อสอบจริง ก.พ. E-EXAM 2569 ทุกรอบสอบ พร้อมเฉลยละเอียด",
    accent: "#b45309",
  },
  {
    key: "practice",
    icon: "✏️",
    title: "ฝึกทำพร้อมเฉลยทันที",
    description: "เลือกคำตอบแล้วเห็นเฉลย + คำอธิบายทันที ไม่จำกัดเวลา",
    accent: "#0f766e",
  },
  {
    key: "category",
    icon: "🎯",
    title: "ติวเจาะรายหมวด",
    description: "สุ่มข้อสอบจากหมวดที่เลือก พร้อมวิเคราะห์จุดอ่อน",
    accent: "#b45309",
  },
  {
    key: "workshop",
    icon: "🛠️",
    title: "แบบฝึกหัดกำหนดเอง",
    description: "เลือกหมวด กำหนดจำนวนข้อ และเวลาทำข้อสอบเอง",
    accent: "#6d28d9",
  },
];

export function getMode(key: string | null) {
  return MODES.find((m) => m.key === key) ?? null;
}
