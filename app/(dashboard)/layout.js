"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar  from "@/components/layout/Topbar";
import { ToastProvider } from "@/components/ui/Toast";
import { UserProvider } from "@/lib/userContext";

export default function DashboardLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <UserProvider>
      <ToastProvider>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          {/* Fixed sidebar */}
          <Sidebar
            mobileOpen={mobileOpen}
            onClose={() => setMobileOpen(false)}
          />

          {/* Main column */}
          <div className="page-content" style={{ flex: 1 }}>
            <Topbar onMenuClick={() => setMobileOpen(true)} />
            <main className="page-inner">
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </UserProvider>
  );
}
