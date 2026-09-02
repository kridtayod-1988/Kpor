"use client";

import { useState } from "react";
import OverviewTab from "./OverviewTab";
import QuestionsTab from "./QuestionsTab";
import AIGeneratorTab from "./AIGeneratorTab";
import UsersTab from "./UsersTab";
import SettingsTab from "./SettingsTab";
import BlueprintTab from "./BlueprintTab";
import ExamSetsTab from "./ExamSetsTab";
import DbTab from "./DbTab";

const TABS = [
  { key: "overview", icon: "📊", label: "ภาพรวม" },
  { key: "questions", icon: "📝", label: "คำถาม" },
  { key: "ai", icon: "✨", label: "เครื่องกำเนิด AI" },
  { key: "users", icon: "👥", label: "ผู้ใช้" },
  { key: "settings", icon: "⚙️", label: "การตั้งค่า" },
  { key: "blueprint", icon: "📐", label: "แผนผัง" },
<<<<<<< HEAD
  { key: "examsets", icon: "📚", label: "ชุดข้อสอบ" },
=======
  { key: "examsets", icon: "📚", label: "หมวดวิชา/ปีสอบ" },
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
  { key: "db", icon: "🗄️", label: "DB" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  return (
    <div>
      <div className="mb-5">
        <div className="font-black text-gray-900 text-xl">⚙️ Admin Panel</div>
        <div className="text-sm text-gray-500">คลังข้อสอบจริง ก.พ. E-EXAM 2569</div>
      </div>

      <div className="flex gap-1.5 flex-wrap mb-5 bg-white border border-gray-200 rounded-2xl p-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-3.5 py-2 rounded-xl text-sm font-semibold transition"
            style={{
              background: activeTab === tab.key ? "#4f46e5" : "transparent",
              color: activeTab === tab.key ? "#fff" : "#6b7280",
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="fade-in" key={activeTab}>
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "questions" && <QuestionsTab />}
        {activeTab === "ai" && <AIGeneratorTab />}
        {activeTab === "users" && <UsersTab />}
        {activeTab === "settings" && <SettingsTab />}
        {activeTab === "blueprint" && <BlueprintTab />}
        {activeTab === "examsets" && <ExamSetsTab />}
        {activeTab === "db" && <DbTab />}
      </div>
    </div>
  );
}
