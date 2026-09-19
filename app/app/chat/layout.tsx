import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Maslahatchi",
  description:
    "Biznesingiz bo'yicha savollaringizga aniq hisob-kitoblar va formulalar asosida javob beruvchi aqlli yordamchi.",
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
