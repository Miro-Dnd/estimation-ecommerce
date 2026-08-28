"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type GroupBy = "aucun" | "categorie" | "version";

export interface Filtres {
  recherche: string;
  categorie: string | null;
  version: string | null;
  groupBy: GroupBy;
}

interface FiltersBarProps {
  filtres: Filtres;
  onChange: (filtres: Filtres) => void;
  categoriesDisponibles: string[];
  versionsDisponibles: string[];
  reorderDisabled: boolean;
  // Emplacement pour des actions supplémentaires (ex. le panneau
  // "Colonnes"), affichées en bout de barre — garde FiltersBar générique.
  children?: ReactNode;
}

export function FiltersBar({
  filtres,
  onChange,
  categoriesDisponibles,
  versionsDisponibles,
  reorderDisabled,
  children,
}: FiltersBarProps) {
  const filtreActif = !!filtres.categorie || !!filtres.version || !!filtres.recherche;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5">
      <Input
        value={filtres.recherche}
        onChange={(e) => onChange({ ...filtres, recherche: e.target.value })}
        placeholder="Rechercher un besoin…"
        className="w-56"
      />

      <select
        value={filtres.categorie ?? ""}
        onChange={(e) =>
          onChange({ ...filtres, categorie: e.target.value || null })
        }
        className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
      >
        <option value="">Toutes les catégories</option>
        {categoriesDisponibles.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        value={filtres.version ?? ""}
        onChange={(e) =>
          onChange({ ...filtres, version: e.target.value || null })
        }
        className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
      >
        <option value="">Toutes les versions/priorités</option>
        {versionsDisponibles.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>

      <div className="ml-auto flex items-center gap-1.5">
        <span className="text-xs font-medium text-slate-500">Regrouper par :</span>
        {(
          [
            { value: "aucun", label: "Liste simple" },
            { value: "categorie", label: "Chapitres (catégorie)" },
            { value: "version", label: "Version/priorité" },
          ] as { value: GroupBy; label: string }[]
        ).map((option) => (
          <button
            key={option.value}
            onClick={() => onChange({ ...filtres, groupBy: option.value })}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              filtres.groupBy === option.value
                ? "bg-indigo-100 text-indigo-700"
                : "text-slate-500 hover:bg-slate-100"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {filtreActif && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            onChange({ ...filtres, recherche: "", categorie: null, version: null })
          }
        >
          Réinitialiser
        </Button>
      )}

      {reorderDisabled && (
        <span className="text-xs text-slate-400">
          Passez en « Liste simple », sans filtre, pour réordonner les lignes par glisser-déposer.
        </span>
      )}

      {children}
    </div>
  );
}
