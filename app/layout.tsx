import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "คลังข้อสอบจริง ก.พ. E-EXAM 2569",
  description: "ระบบฝึกทำข้อสอบ ก.พ. พร้อมเฉลยละเอียดและติวเจาะรายหมวด",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
