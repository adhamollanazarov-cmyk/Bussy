import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Biznes-reja",
  description:
    "Banklar va investorlar uchun 11 bo'limli to'liq professional biznes-reja generatori.",
};

export default function BusinessPlanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
