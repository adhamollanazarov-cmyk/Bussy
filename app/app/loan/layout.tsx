import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kredit kalkulyatori",
  description:
    "Annuitet kredit to'lovlari, amortizatsiya jadvali va qarz yuki (DTI) tahlili.",
};

export default function LoanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
