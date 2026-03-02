import type { LucideIcon } from "lucide-react";

// ── EmptyState ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  /** Icon component from lucide-react */
  icon: LucideIcon;
  /** Main message */
  message: string;
}

export function EmptyState({ icon: Icon, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <Icon className="size-8 text-zinc-200" />
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  );
}
