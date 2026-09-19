import type { Metadata } from "next";
import { NotFoundContent } from "@/components/not-found-content";

export const metadata: Metadata = {
  title: "Sahifa topilmadi",
  description: "So‘ralgan sahifa mavjud emas.",
};

/**
 * 404 — mos kelmaydigan barcha manzillar uchun.
 * Server komponent bo'lib qoladi (metadata shart), matn esa klient
 * komponentga chiqarilgan — shunda joriy til (uz/en) qo'llaniladi.
 */
export default function NotFound() {
  return <NotFoundContent />;
}
