// components/ui/Toast.js
// Simple toast notification system using React context

"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle className="w-4 h-4" />,
  error:   <AlertCircle className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  info:    <Info className="w-4 h-4" />,
};

const COLORS = {
  success: { border: "var(--status-green)", color: "var(--status-green)" },
  error:   { border: "var(--status-red)",   color: "var(--status-red)"   },
  warning: { border: "var(--status-amber)", color: "var(--status-amber)" },
  info:    { border: "var(--status-blue)",  color: "var(--status-blue)"  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ type = "info", title, message, duration = 4000 }) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 360,
          width: "100%",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-slide-up"
            style={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              borderLeft: `3px solid ${COLORS[t.type].border}`,
              borderRadius: 8,
              padding: "12px 14px",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            <span style={{ color: COLORS[t.type].color, flexShrink: 0, marginTop: 1 }}>
              {ICONS[t.type]}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {t.title && (
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: t.message ? 2 : 0 }}>
                  {t.title}
                </div>
              )}
              {t.message && (
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
                  {t.message}
                </div>
              )}
            </div>
            <button
              onClick={() => remove(t.id)}
              style={{ color: "var(--subtle)", background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 2 }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}
