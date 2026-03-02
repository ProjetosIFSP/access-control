// ── CrudPageHeader ────────────────────────────────────────────────────────────

interface CrudPageHeaderProps {
  title: string;
  subtitle?: string;
}

export function CrudPageHeader({ title, subtitle }: CrudPageHeaderProps) {
  return (
    <div className="flex flex-col">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">{subtitle}</p>
      )}
    </div>
  );
}
