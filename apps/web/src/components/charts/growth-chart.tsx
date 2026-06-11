'use client';

import type { RegistrationGrowthItem } from '@platform/types';

interface GrowthChartProps {
  data: RegistrationGrowthItem[];
}

export function GrowthChart({ data }: GrowthChartProps) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex h-48 items-end gap-1">
      {data.map((item) => {
        const height = (item.count / max) * 100;
        const label = item.date.slice(5);
        return (
          <div key={item.date} className="group flex flex-1 flex-col items-center gap-1">
            <div className="relative w-full">
              <div
                className="mx-auto w-full max-w-[24px] rounded-t bg-brand-500 transition-all group-hover:bg-brand-600"
                style={{ height: `${Math.max(height, 4)}%`, minHeight: item.count > 0 ? '8px' : '2px' }}
                title={`${item.count} cadastros`}
              />
            </div>
            <span className="hidden text-[10px] text-slate-400 sm:block">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
