"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

interface ComboboxProps {
  value: string;
  suggestions: readonly string[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onBlurCommit?: (value: string) => void;
}

/**
 * Champ texte libre avec suggestions natives (via <datalist>) : l'utilisateur
 * peut choisir une valeur proposée ou taper la sienne. Volontairement simple
 * (pas de librairie de combobox) : suffisant pour ce besoin et sans coût de
 * maintenance supplémentaire.
 */
export function Combobox({
  value,
  suggestions,
  onChange,
  placeholder,
  className,
  onBlurCommit,
}: ComboboxProps) {
  const listId = useId();
  return (
    <>
      <input
        list={listId}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlurCommit?.(e.target.value)}
        className={cn(
          "w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-slate-900 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 focus:bg-white transition-colors",
          className
        )}
      />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </>
  );
}
