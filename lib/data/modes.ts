<<<<<<< HEAD
// นิยาม 4 โหมดของหน้าหลัก — ใช้ทั้งหน้า 1 (การ์ดเลือกโหมด) และหน้า 2 (ชิปโหมดด่วน)
export type ModeKey = "archive" | "practice" | "category" | "workshop";
=======
// นิยาม 3 โหมดจริงตามที่ฐานข้อมูลรองรับ (exam_attempts.mode CHECK constraint)
export type ModeKey = "full100" | "category" | "year";
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc

export const MODES: {
  key: ModeKey;
  icon: string;
  title: string;
  description: string;
<<<<<<< HEAD
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
=======
  accent: string;
}[] = [
  {
    key: "full100",
    icon: "🏆",
    title: "จำลองสนามจริง (100 ข้อ)",
    description: "สุ่มข้อสอบเต็มรูปแบบตามจำนวนข้อที่ตั้งค่าไว้ จับเวลาเหมือนสนามสอบจริง",
    accent: "#1d4ed8",
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
  },
  {
    key: "category",
    icon: "🎯",
    title: "ติวเจาะรายหมวด",
<<<<<<< HEAD
    description: "สุ่มข้อสอบจากหมวดที่เลือก พร้อมวิเคราะห์จุดอ่อน",
    accent: "#b45309",
  },
  {
    key: "workshop",
    icon: "🛠️",
    title: "แบบฝึกหัดกำหนดเอง",
    description: "เลือกหมวด กำหนดจำนวนข้อ และเวลาทำข้อสอบเอง",
    accent: "#6d28d9",
=======
    description: "เลือกหมวดวิชาที่อยากฝึก ระบบจะสุ่มข้อที่ยังไม่เคยทำมาให้ก่อน",
    accent: "#b45309",
  },
  {
    key: "year",
    icon: "📚",
    title: "คลังข้อสอบเก่า (ตามรอบ/ปี)",
    description: "เลือกรอบสอบหรือปีที่ต้องการ ฝึกทำข้อสอบจริงจากรอบนั้น ๆ",
    accent: "#0f766e",
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
  },
];

export function getMode(key: string | null) {
  return MODES.find((m) => m.key === key) ?? null;
}
