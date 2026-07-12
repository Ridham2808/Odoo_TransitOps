"use client";

// Animated truck icon using the locally hosted Lordicon JSON.
// Used in: Sidebar logo (loop, black), Sidebar Fleet nav (hover, white/grey)
// All other app icons use lucide-react.

import { useEffect, useRef } from "react";

export default function TruckIcon({
  size    = 18,
  trigger = "hover",
  // Pass explicit colors string, OR use isActive shorthand for nav items
  colors,
  isActive = false,
}) {
  const ref = useRef(null);

  // Resolve colors: explicit > isActive > default
  const resolvedColors = colors
    ?? (isActive
      ? "primary:#ffffff,secondary:#aaaaaa"
      : "primary:#666666,secondary:#444444");

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    let cancelled = false;

    function inject() {
      if (cancelled || !container) return;
      container.innerHTML = `<lord-icon
        src="/icons/truck.json"
        trigger="${trigger}"
        colors="${resolvedColors}"
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
      }, 100);
      return () => { cancelled = true; clearInterval(id); };
    }
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, trigger, resolvedColors]);

  return (
    <span
      ref={ref}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        lineHeight: 0,
      }}
    />
  );
}
