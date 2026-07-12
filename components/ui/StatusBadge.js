// components/ui/StatusBadge.js
// Consistent status badge used across Fleet, Drivers, Trips, Maintenance

import { cn } from "@/lib/utils";

const COLOR_MAP = {
  green: "badge-green",
  blue:  "badge-blue",
  amber: "badge-amber",
  red:   "badge-red",
};

const DOT_COLOR = {
  green: "bg-status-green",
  blue:  "bg-status-blue",
  amber: "bg-status-amber",
  red:   "bg-status-red",
};

/**
 * @param {{ color: "green"|"blue"|"amber"|"red", label: string, dot?: boolean, className?: string }} props
 */
export default function StatusBadge({ color = "amber", label, dot = true, className }) {
  return (
    <span className={cn("badge", COLOR_MAP[color], className)}>
      {dot && (
        <span
          className={cn("inline-block w-1.5 h-1.5 rounded-full flex-shrink-0", DOT_COLOR[color])}
          style={{ background: `var(--status-${color})` }}
        />
      )}
      {label}
    </span>
  );
}
