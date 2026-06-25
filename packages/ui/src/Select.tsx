import type { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({ label, error, options, className = '', id, ...props }: SelectProps) {
  const selectId = id || props.name;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 focus:border-brand-500 disabled:cursor-not-allowed disabled:bg-slate-50 ${
          error ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 hover:border-slate-300'
        } ${className}`}
        {...props}
      >
        <option value="" disabled hidden>Selecione...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
