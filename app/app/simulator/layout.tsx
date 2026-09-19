import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "What-if simulyatori",
  description:
    "Narx, xarajat va savdo hajmi o'zgarishining biznesingiz sof foydasiga ta'sirini interaktiv modellashtirish.",
};

export default function SimulatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
