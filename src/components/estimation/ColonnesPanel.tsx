"use client";

import { useEffect, useRef, useState } from "react";
import type { ColonneId } from "@/lib/grillePreferences";
import { COLONNES_GRILLE_ESTIMATION } from "@/lib/grillePreferences";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";

interface ColonnesPanelProps {
  colonnesMasquees: ColonneId[];
  onBasculerColonne: (id: ColonneId, masquee: boolean) => void;
  onAfficherToutesLesColonnes: () => void;
  onReinitialiserDimensions: () => void;
}

/**
 * Bouton "Colonnes" + panneau de configuration : afficher/masquer chaque
 * colonne, tout réafficher, ou réinitialiser largeurs/hauteurs (avec
 * confirmation — action destructive pour les personnalisations en cours).
 * Éléments natifs (bouton, checkboxes) pour une accessibilité clavier
 * gratuite ; fermeture au clic extérieur ou à Échap.
 */
export function ColonnesPanel({
  colonnesMasquees,
  onBasculerColonne,
  onAfficherToutesLesColonnes,
  onReinitialiserDimensions,
}: ColonnesPanelProps) {
  const [ouvert, setOuvert] = useState(false);
  const [confirmationOuverte, setConfirmationOuverte] = useState(false);
  const conteneurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    function onPointerDownDehors(e: PointerEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOuvert(false);
    }
    document.addEventListener("pointerdown", onPointerDownDehors);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDownDehors);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [ouvert]);

  const nombreMasquees = colonnesMasquees.length;

  return (
    <div className="relative" ref={conteneurRef}>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setOuvert((v) => !v)}
        aria-haspopup="true"
        aria-expanded={ouvert}
      >
        Colonnes{nombreMasquees > 0 ? ` (${nombreMasquees} masquée${nombreMasquees > 1 ? "s" : ""})` : ""}
      </Button>

      {ouvert && (
        <div
          role="menu"
          aria-label="Colonnes affichées dans la grille"
          className="absolute right-0 z-20 mt-1.5 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
        >
          <ul className="max-h-72 space-y-0.5 overflow-y-auto">
            {COLONNES_GRILLE_ESTIMATION.map((colonne) => {
              const masquee = colonnesMasquees.includes(colonne.id);
              return (
                <li key={colonne.id}>
                  <label
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                      colonne.masquable
                        ? "cursor-pointer text-slate-700 hover:bg-slate-50"
                        : "text-slate-400"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={!masquee}
                      disabled={!colonne.masquable}
                      onChange={(e) => onBasculerColonne(colonne.id, !e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/40"
                    />
                    <span className="truncate">{colonne.libelle}</span>
                    {!colonne.masquable && (
                      <span className="ml-auto shrink-0 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Requise
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={onAfficherToutesLesColonnes}
              className="rounded px-1.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800"
            >
              Tout afficher
            </button>
            <button
              type="button"
              onClick={() => setConfirmationOuverte(true)}
              className="rounded px-1.5 py-1 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600"
            >
              Réinitialiser les dimensions…
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmationOuverte}
        title="Réinitialiser toutes les dimensions ?"
        description="Les largeurs de colonnes et hauteurs de lignes personnalisées sont remises aux valeurs par défaut. Les colonnes masquées ne sont pas concernées (utilisez « Tout afficher » pour ça)."
        confirmLabel="Réinitialiser"
        danger
        onConfirm={() => {
          onReinitialiserDimensions();
          setConfirmationOuverte(false);
        }}
        onCancel={() => setConfirmationOuverte(false)}
      />
    </div>
  );
}
