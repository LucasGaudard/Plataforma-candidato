import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center transition-all hover:bg-slate-50">
      {icon && (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm text-3xl">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-slate-500 leading-relaxed">{description}</p>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
