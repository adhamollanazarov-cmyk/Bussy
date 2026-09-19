import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bozor tahlili",
  description:
    "Hududlar, sohalar va raqobatchilar bo'yicha tahlillar hamda xavf-xatarlar bahosi.",
};

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return children;
}
