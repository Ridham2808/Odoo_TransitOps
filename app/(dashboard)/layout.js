"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar  from "@/components/layout/Topbar";
import { ToastProvider } from "@/components/ui/Toast";

export default function DashboardLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ToastProvider>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Fixed sidebar */}
        <Sidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />

        {/* Main column — pushed right of sidebar */}
        <div className="page-content" style={{ flex: 1 }}>
          {/* Sticky top bar */}
          <Topbar onMenuClick={() => setMobileOpen(true)} />

          {/* Page content */}
          <main className="page-inner">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
