// components/ui/EmptyState.js
import { cn } from "@/lib/utils";

/**
 * @param {{ icon?: React.ReactNode, title: string, description?: string, action?: React.ReactNode, className?: string }} props
 */
export default function EmptyState({ icon, title, description, action, className }) {
  return (
    <div className={cn("empty-state", className)}>
      {icon && (
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-surface-elevated border border-token mb-2" style={{ border: "1px solid var(--border)" }}>
          <span className="text-muted">{icon}</span>
        </div>
      )}
      <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{title}</p>
      {description && (
        <p className="text-xs max-w-xs" style={{ color: "var(--muted)" }}>{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
