import React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BusinessProvider } from "@/lib/store/business-store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <BusinessProvider>
      <div data-app-shell className="flex h-screen overflow-hidden bg-slate-50 font-sans">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex md:shrink-0 print:hidden">
          <Sidebar />
        </div>

        {/* Main Content Area */}
        <div data-app-scroll className="flex flex-1 flex-col overflow-y-auto">
          <Header />
          <main
            data-app-main
            className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto print:max-w-none print:p-0"
          >
            {children}
          </main>
        </div>
      </div>
    </BusinessProvider>
  );
}
