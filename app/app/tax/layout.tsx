import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Soliq kalkulyatori",
  description:
    "O'zbekistondagi 3 ta soliq rejimini (aylanma, umumiy, YaTT) solishtirish va eng maqbulini tanlash.",
};

export default function TaxLayout({ children }: { children: React.ReactNode }) {
  return children;
}
