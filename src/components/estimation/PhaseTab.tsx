"use client";

import { useMemo, useState } from "react";
import type { Ligne, LigneInput, Phase } from "@/types";
import type { TauxParType } from "@/lib/calculations";
import { Button } from "@/components/ui/Button";
import { FiltersBar, Filtres } from "@/components/estimation/FiltersBar";
import { EstimationTable } from "@/components/estimation/EstimationTable";
import { SummaryPanel } from "@/components/estimation/SummaryPanel";
import { CATEGORIES_SUGGEREES, VERSIONS_SUGGEREES } from "@/lib/constants";

interface PhaseTabProps {
  phase: Phase;
  lignes: Ligne[];
  tauxParType: TauxParType;
  ajoutEnCours: boolean;
  onAjouterLigne: (phase: Phase) => void;
  onChangeLigne: (ligneId: string, patch: LigneInput) => void;
  onDeleteLigne: (ligne: Ligne) => void;
  onDuplicateLigne: (ligneId: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

/**
 * Un onglet de phase = un tableau de lignes indépendant, filtré sur cette
 * phase, avec ses propres filtres/regroupement — comme l'ancien onglet
 * "Détail" unique, mais répété une fois par phase du projet.
 */
export function PhaseTab({
  phase,
  lignes,
  tauxParType,
  ajoutEnCours,
  onAjouterLigne,
  onChangeLigne,
  onDeleteLigne,
  onDuplicateLigne,
  onReorder,
}: PhaseTabProps) {
  const [filtres, setFiltres] = useState<Filtres>({
    recherche: "",
    categorie: null,
    version: null,
    groupBy: "categorie",
  });

  const lignesPhase = useMemo(
    () => lignes.filter((l) => l.phase === phase),
    [lignes, phase]
  );

  const categoriesUtilisees = useMemo(
    () => Array.from(new Set(lignesPhase.map((l) => l.categorie).filter(Boolean))),
    [lignesPhase]
  );
  const versionsUtilisees = useMemo(
    () => Array.from(new Set(lignesPhase.map((l) => l.version).filter(Boolean))),
    [lignesPhase]
  );

  const lignesFiltrees = useMemo(() => {
    const q = filtres.recherche.trim().toLowerCase();
    return lignesPhase.filter((l) => {
      if (filtres.categorie && l.categorie !== filtres.categorie) return false;
      if (filtres.version && l.version !== filtres.version) return false;
      if (q) {
        const cible = `${l.besoinClient} ${l.solutionProposee}`.toLowerCase();
        if (!cible.includes(q)) return false;
      }
      return true;
    });
  }, [lignesPhase, filtres]);

  const reorderEnabled =
    filtres.groupBy === "aucun" && !filtres.categorie && !filtres.version && !filtres.recherche;

  return (
    <div className="mt-4 flex flex-col gap-4 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <FiltersBar
          filtres={filtres}
          onChange={setFiltres}
          categoriesDisponibles={Array.from(
            new Set([...CATEGORIES_SUGGEREES, ...categoriesUtilisees])
          )}
          versionsDisponibles={Array.from(
            new Set([...VERSIONS_SUGGEREES, ...versionsUtilisees])
          )}
          reorderDisabled={!reorderEnabled}
        />

        <EstimationTable
          lignes={lignesFiltrees}
          tauxParType={tauxParType}
          groupBy={filtres.groupBy}
          reorderEnabled={reorderEnabled}
          onChangeLigne={onChangeLigne}
          onDeleteLigne={onDeleteLigne}
          onDuplicateLigne={onDuplicateLigne}
          onReorder={onReorder}
          categoriesUtilisees={categoriesUtilisees}
          versionsUtilisees={versionsUtilisees}
        />

        <div className="border-t border-slate-100 p-3">
          <Button variant="outline" onClick={() => onAjouterLigne(phase)} disabled={ajoutEnCours}>
            + Ajouter une ligne
          </Button>
        </div>
      </div>

      <div className="w-full shrink-0 lg:w-80">
        <SummaryPanel lignes={lignesPhase} tauxParType={tauxParType} />
      </div>
    </div>
  );
}
