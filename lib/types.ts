// ชนิดข้อมูลหลัก — เขียนด้วยมือให้ตรงกับ schema.sql
// (ในโปรเจกต์จริงแนะนำให้ใช้ `supabase gen types typescript` เพื่อ generate อัตโนมัติแทน)

export type ExamMode = "simulation" | "practice" | "archive" | "workshop" | "category";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  xp: number;
  level: number;
};

export type ExamSet = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  mode: ExamMode;
  question_count: number;
  max_score: number;
  pass_score: number;
  pass_pct_label: string | null;
  time_limit_minutes: number;
  is_gpa3: boolean;
  is_published: boolean;
};

export type ExamSetSection = {
  id: string;
  exam_set_id: string;
  label: string;
  icon: string | null;
  subcategory_ids: string[];
  question_count: number;
  max_score: number;
  pass_score: number;
  description: string | null;
  fail_message: string | null;
};

export type Question = {
  id: string;
  subcategory_id: string;
  text: string;
  passage: string | null;
  choices: string[];
  correct_index: number;
  explanation: string;
  source_round: string;
};

export type UserAnswer = {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_index: number | null;
  is_flagged: boolean;
  is_correct: boolean | null;
};

export type UserAttempt = {
  id: string;
  user_id: string;
  exam_set_id: string | null;
  mode: ExamMode;
  started_at: string;
  finished_at: string | null;
  elapsed_seconds: number | null;
  raw_score: number | null;
  max_score: number | null;
  passed: boolean | null;
  passed_sections: Record<string, boolean> | null;
};

// Placeholder — แทนที่ด้วย generated types จาก Supabase CLI เมื่อพร้อม
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
