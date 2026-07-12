"use client";

// components/ui/LordIcon.js
// Uses locally hosted Lordicon JSON files from /public/icons/
// Injects lord-icon via innerHTML after the CDN script registers the custom element.
// Falls back to CDN URL for any icon not yet locally cached.

import { useEffect, useRef } from "react";

// ── Icon map — /public/icons/*.json (locally hosted, served by Next.js) ───────
// Format: friendly name → public path (or CDN fallback)
export const LORDICON = {
  // ── Core Navigation / Sidebar ────────────────────────────────────────────
  dashboard:    "/icons/dashboard.json",        // grid / home dashboard
  truck:        "/icons/truck.json",            // truck delivery (user's custom icon)
  users:        "/icons/users.json",            // drivers / people
  route:        "/icons/route.json",            // trip route / navigation
  wrench:       "/icons/wrench.json",           // maintenance / tools
  fuel:         "https://cdn.lordicon.com/czfxhrdo.json",   // fuel pump (CDN fallback)
  analytics:    "https://cdn.lordicon.com/dqjuoope.json",   // bar chart analytics
  settings:     "https://cdn.lordicon.com/oqpzerrr.json",   // gear settings

  // ── Topbar / Auth ─────────────────────────────────────────────────────────
  search:       "/icons/search.json",
  bell:         "/icons/bell.json",
  logout:       "/icons/logout.json",
  menu:         "/icons/menu.json",
  close:        "/icons/close.json",
  chevronDown:  "/icons/chevron-down.json",
  eye:          "/icons/eye.json",
  eyeOff:       "/icons/eye-off.json",
  arrowRight:   "/icons/arrow-right.json",
  alert:        "/icons/alert.json",
  zap:          "/icons/zap.json",            // lightning bolt — app logo

  // ── Dashboard KPIs ────────────────────────────────────────────────────────
  trendUp:      "/icons/trend-up.json",
  refresh:      "/icons/refresh.json",
  activity:     "https://cdn.lordicon.com/tfkuaeav.json",  // activity / pulse
};

// ── Component ──────────────────────────────────────────────────────────────
export default function LordIcon({
  name,
  src,
  trigger   = "hover",
  size      = 20,
  colors    = "primary:#ffffff,secondary:#555555",
  className = "",
  style     = {},
}) {
  const ref     = useRef(null);
  const iconSrc = src ?? LORDICON[name];

  useEffect(() => {
    const container = ref.current;
    if (!container || !iconSrc) return;

    let cancelled = false;

    function inject() {
      if (cancelled || !container) return;
      container.innerHTML = `<lord-icon
        src="${iconSrc}"
        trigger="${trigger}"
        colors="${colors}"
        style="width:${size}px;height:${size}px;display:block;pointer-events:none;">
      </lord-icon>`;
    }

    if (typeof customElements !== "undefined" && customElements.get("lord-icon")) {
      inject();
    } else {
      const id = setInterval(() => {
        if (typeof customElements !== "undefined" && customElements.get("lord-icon")) {
          clearInterval(id);
          inject();
        }
      }, 80);
      return () => { cancelled = true; clearInterval(id); };
    }

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iconSrc, trigger, colors, size]);

  return (
    <span
      ref={ref}
      className={className}
      style={{
        display:        "inline-flex",
        alignItems:     "center",
        justifyContent: "center",
        flexShrink:     0,
        lineHeight:     0,
        ...style,
      }}
    />
  );
}
