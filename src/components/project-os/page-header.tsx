import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, icon: Icon, actions }: PageHeaderProps) {
  return (
    <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
          <Icon className="size-3.5" /> {eyebrow}
        </div>
        <h1 className="text-2xl font-semibold tracking-[-0.035em] md:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
