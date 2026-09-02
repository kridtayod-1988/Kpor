// ชนิดข้อมูลหลัก — ปรับให้ตรงกับฐานข้อมูล Supabase "KPOR" ที่ใช้งานจริง
// (ต่างจากดีไซน์ตั้งต้น: ใช้ categories/exam_years แทน subcategories/exam_sets)

export type ExamMode = "full100" | "category" | "year";

export type Profile = {
  id: string;
  display_name: string | null;
  email: string | null;
  role: "user" | "admin";
  photo_url: string | null;
  total_attempts: number;
  best_score: number;
  total_exp: number;
  last_attempt_at: string | null;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export type ExamYear = {
  id: string;
  label: string;
  year: number;
  is_active: boolean;
};

export type SafeQuestion = {
  id: string;
  category_id: string;
  exam_year_id: string | null;
  question_text: string;
  table_data: Record<string, unknown> | null;
  options: string[];
  difficulty: "easy" | "medium" | "hard";
};

export type QuestionRow = SafeQuestion & {
  correct_answer_index: number;
  explanation: string;
  is_active: boolean;
  source: "manual" | "ai_generated";
};

export type ExamAttempt = {
  id: string;
  user_id: string;
  mode: ExamMode;
  category_id: string | null;
  exam_year_id: string | null;
  question_ids: string[];
  user_answers: (number | null)[];
  flagged_question_ids: string[];
  instant_reveal: boolean;
  score: number;
  total_questions: number;
  exp_gained: number;
  started_at: string;
  finished_at: string | null;
  duration_seconds: number;
};

export type ReviewRow = {
  question_id: string;
  category_id: string;
  question_text: string;
  table_data: Record<string, unknown> | null;
  options: string[];
  correct_answer_index: number;
  explanation: string;
  selected_index: number | null;
  is_flagged: boolean;
  is_correct: boolean;
  question_position: number;
};

// Placeholder — แทนที่ด้วย generated types จาก Supabase CLI เมื่อพร้อม
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
