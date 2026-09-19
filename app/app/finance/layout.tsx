import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moliyaviy tahlil",
  description:
    "Yalpi va sof foyda, rentabellik marjasi hamda zararsizlik nuqtasi (break-even) hisob-kitobi.",
};

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
