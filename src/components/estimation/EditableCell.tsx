"use client";

import { cn } from "@/lib/utils";

interface NumberCellProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  ariaLabel?: string;
  step?: number;
  max?: number;
}

/**
 * Cellule numérique éditable en place (temps en jours/homme). Volontairement
 * minimaliste : un simple champ number stylé pour ressembler à une cellule
 * de tableur plutôt qu'à un formulaire classique.
 */
export function NumberCell({
  value,
  onChange,
  className,
  ariaLabel,
  step = 0.5,
  max,
}: NumberCellProps) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min={0}
      max={max}
      aria-label={ariaLabel}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => {
        const next = e.target.valueAsNumber;
        onChange(Number.isNaN(next) ? 0 : next);
      }}
      onFocus={(e) => e.target.select()}
      className={cn(
        "w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-right text-sm text-slate-900 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 focus:bg-white transition-colors",
        className
      )}
    />
  );
}
