"use client";

import { useMemo } from "react";
import type { Ligne, LigneInput, TarifUo } from "@/types";
import { Button } from "@/components/ui/Button";
import { ConceptionGeneraleTable } from "@/components/estimation/ConceptionGeneraleTable";
import { construireTarifParCode } from "@/lib/calculations";
import { BLOCS_CONCEPTION_GENERALE } from "@/lib/constants";

interface ConceptionGeneraleTabProps {
  lignes: Ligne[];
  tarifs: TarifUo[];
  ajoutEnCours: boolean;
  onAjouterLigne: (categorie: string) => void;
  onChangeLigne: (ligneId: string, patch: LigneInput) => void;
  onDeleteLigne: (ligne: Ligne) => void;
  onDuplicateLigne: (ligneId: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

/**
 * Conception générale n'a pas de filtres ni de regroupement dynamique : sa
 * structure est fixe, un bloc visuel par titre (comme Analyse ou Synthèse),
 * chacun avec son propre tableau de lignes. Exprimée en jours, pas en UO —
 * cette phase ne passe pas par la répartition UO, chaque profil a un temps
 * saisi directement et un budget dérivé de son tarif journalier.
 */
export function ConceptionGeneraleTab({
  lignes,
  tarifs,
  ajoutEnCours,
  onAjouterLigne,
  onChangeLigne,
  onDeleteLigne,
  onDuplicateLigne,
  onReorder,
}: ConceptionGeneraleTabProps) {
  const lignesPhase = lignes.filter((l) => l.phase === "conceptionGenerale");
  const tarifParCode = useMemo(() => construireTarifParCode(tarifs), [tarifs]);

  return (
    <div className="mt-4 space-y-4">
      {BLOCS_CONCEPTION_GENERALE.map((titre) => {
        const lignesBloc = lignesPhase.filter((l) => l.categorie === titre);
        return (
          <div
            key={titre}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800">{titre}</h3>
            </div>

            <ConceptionGeneraleTable
              lignes={lignesBloc}
              tarifParCode={tarifParCode}
              onChangeLigne={onChangeLigne}
              onDeleteLigne={onDeleteLigne}
              onDuplicateLigne={onDuplicateLigne}
              onReorder={onReorder}
              messageVide="Aucune ligne pour ce bloc."
            />

            <div className="border-t border-slate-100 p-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAjouterLigne(titre)}
                disabled={ajoutEnCours}
              >
                + Ajouter une ligne
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
