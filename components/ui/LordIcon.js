"use client";

// components/ui/LordIcon.js
// Wrapper for Lordicon animated web component icons.
// The <lord-icon> custom element is registered by the CDN script in app/layout.js.
//
// Usage:
//   <LordIcon name="truck" size={20} trigger="hover" colors="primary:#fff" />
//
// Triggers: "hover" | "click" | "loop" | "loop-on-hover" | "boomerang" | "morph"

import { useEffect, useRef } from "react";

// ── Icon map — Lordicon CDN URLs ───────────────────────────────────────────
// Each key maps to a free-tier Lordicon animated icon JSON.
export const LORDICON = {
  // ── Navigation / Sidebar ─────────────────────────────────────────────────
  dashboard: "https://cdn.lordicon.com/wmwqvixz.json",
  truck: "https://cdn.lordicon.com/psnhyobz.json",
  users: "https://cdn.lordicon.com/dxjqoygy.json",
  route: "https://cdn.lordicon.com/lznlxwtc.json",
  wrench: "https://cdn.lordicon.com/vyukcgvf.json",
  fuel: "https://cdn.lordicon.com/wiupeznj.json",
  analytics: "https://cdn.lordicon.com/eupfhsvm.json",
  settings: "https://cdn.lordicon.com/hwjcdzcz.json",

  // ── Topbar / Auth ─────────────────────────────────────────────────────────
  search: "https://cdn.lordicon.com/fkdzyfle.json",
  bell: "https://cdn.lordicon.com/pqxdilfs.json",
  logout: "https://cdn.lordicon.com/iykgtsbt.json",
  menu: "https://cdn.lordicon.com/pbrgppbb.json",
  close: "https://cdn.lordicon.com/nqtddedc.json",
  chevronDown: "https://cdn.lordicon.com/rqsvgwdj.json",
  eye: "https://cdn.lordicon.com/lomfljuq.json",
  eyeOff: "https://cdn.lordicon.com/sbiheqdr.json",
  arrowRight: "https://cdn.lordicon.com/seer7yfh.json",
  alert: "https://cdn.lordicon.com/tyvtvbcy.json",
  zap: "https://cdn.lordicon.com/wloilxuq.json",

  // ── Dashboard KPIs ────────────────────────────────────────────────────────
  trendUp: "https://cdn.lordicon.com/dqxvvqzi.json",
  trendDown: "https://cdn.lordicon.com/vduvxizq.json",
  refresh: "https://cdn.lordicon.com/gqzfzudq.json",
  activity: "https://cdn.lordicon.com/prqfargo.json",
  user: "https://cdn.lordicon.com/fdjkafnq.json",
};

// ── Component ──────────────────────────────────────────────────────────────
export default function LordIcon({
  name,
  src,
  trigger = "hover",
  size = 20,
  colors = "primary:#ffffff,secondary:#555555",
  className = "",
  style = {},
}) {
  const ref = useRef(null);
  const iconSrc = src ?? LORDICON[name];

  // lord-icon is a custom element — set attributes via DOM ref
  // to avoid React's attribute filtering on unknown HTML elements.
  useEffect(() => {
    const el = ref.current;
    if (!el || !iconSrc) return;

    // Wrap in a timeout so the CDN script has time to register the element
    const apply = () => {
      if (typeof customElements !== "undefined" && customElements.get("lord-icon")) {
        el.setAttribute("src", iconSrc);
        el.setAttribute("trigger", trigger);
        el.setAttribute("colors", colors);
      } else {
        // Retry after CDN script loads
        setTimeout(apply, 200);
      }
    };
    apply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iconSrc, trigger, colors]);

  return (
    // Use <span> as outer container so it's valid in any context
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        ...style,
      }}
    >
      <lord-icon
        ref={ref}
        src={iconSrc}
        trigger={trigger}
        colors={colors}
        style={{ width: size, height: size, display: "block" }}
      />
    </span>
  );
}
