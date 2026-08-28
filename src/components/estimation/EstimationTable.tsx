"use client";

import { useMemo } from "react";
import { useIsClient } from "@/lib/useIsClient";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Ligne, LigneInput } from "@/types";
import {
  TauxParType,
  calculerTotauxLigne,
  calculerTotauxParGroupe,
  formaterEuros,
  formaterJours,
  formaterUo,
} from "@/lib/calculations";
import {
  COLONNES_GRILLE_ESTIMATION,
  ColonneId,
  PreferencesGrilleEstimation,
  colonneVisible,
  hauteurLigne,
  largeurColonne,
} from "@/lib/grillePreferences";
import { Combobox } from "@/components/ui/Combobox";
import { NumberCell } from "@/components/estimation/EditableCell";
import { ResizeHandle } from "@/components/estimation/ResizeHandle";
import { CATEGORIES_SUGGEREES, VERSIONS_SUGGEREES, couleurPourCategorie } from "@/lib/constants";
import type { GroupBy } from "@/components/estimation/FiltersBar";
import { cn } from "@/lib/utils";

// Gouttière (poignée de réordonnancement + redimensionnement de ligne) et
// colonne d'actions : chrome de la grille, pas des colonnes de données —
// toujours présentes, non masquables, largeur fixe (pas de redimensionnement,
// leur contenu est de taille constante).
const LARGEUR_GOUTTIERE = 28;
const LARGEUR_ACTIONS = 72;
// Marge verticale approximative d'une cellule (py-1.5 haut + bas) à déduire
// de la hauteur de ligne pour dimensionner les <textarea> en conséquence.
const MARGE_VERTICALE_CELLULE = 12;

interface EstimationTableProps {
  lignes: Ligne[];
  tauxParType: TauxParType;
  groupBy: GroupBy;
  reorderEnabled: boolean;
  onChangeLigne: (ligneId: string, patch: LigneInput) => void;
  onDeleteLigne: (ligne: Ligne) => void;
  onDuplicateLigne: (ligneId: string) => void;
  onReorder: (orderedIds: string[]) => void;
  categoriesUtilisees: string[];
  versionsUtilisees: string[];
  // Unité affichée pour le temps total mixte (Design/Front/Back/Config) —
  // "uo" par défaut (le mix a un coût pondéré, plus une simple somme de
  // jours homogène), "jour" pour les phases qui n'utilisent pas les UO.
  uniteTemps?: "uo" | "jour";
  messageVide?: string;
  preferences: PreferencesGrilleEstimation;
  onDefinirLargeurColonne: (id: ColonneId, largeur: number) => void;
  onReinitialiserLargeurColonne: (id: ColonneId) => void;
  onDefinirHauteurLigne: (ligneId: string, hauteur: number) => void;
  onReinitialiserHauteurLigne: (ligneId: string) => void;
}

export function EstimationTable({
  lignes,
  tauxParType,
  groupBy,
  reorderEnabled,
  onChangeLigne,
  onDeleteLigne,
  onDuplicateLigne,
  onReorder,
  categoriesUtilisees,
  versionsUtilisees,
  uniteTemps = "uo",
  messageVide = "Aucune ligne ne correspond à vos filtres.",
  preferences,
  onDefinirLargeurColonne,
  onReinitialiserLargeurColonne,
  onDefinirHauteurLigne,
  onReinitialiserHauteurLigne,
}: EstimationTableProps) {
  // dnd-kit génère des identifiants internes qui peuvent différer entre le
  // rendu serveur et l'hydratation client (compteur non stable en SSR) : on
  // ne monte le glisser-déposer qu'une fois côté client pour éviter tout
  // avertissement d'hydratation. Avant cela, la table s'affiche normalement,
  // simplement sans réordonnancement.
  const monteCote = useIsClient();
  const reorderActif = reorderEnabled && monteCote;
  const formaterTotal = uniteTemps === "jour" ? formaterJours : formaterUo;
  const libelleTotal = uniteTemps === "jour" ? "Total j." : "Total UO";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const categories = useMemo(
    () => Array.from(new Set([...CATEGORIES_SUGGEREES, ...categoriesUtilisees])),
    [categoriesUtilisees]
  );
  const versions = useMemo(
    () => Array.from(new Set([...VERSIONS_SUGGEREES, ...versionsUtilisees])),
    [versionsUtilisees]
  );

  const colonnesAffichees = useMemo(
    () => COLONNES_GRILLE_ESTIMATION.filter((c) => colonneVisible(preferences, c.id)),
    [preferences]
  );
  const colSpanGroupe = 1 + colonnesAffichees.length + 1;
  // table-layout:fixed ne respecte les largeurs du <colgroup> comme des
  // valeurs absolues que si la table a elle-même une largeur explicite —
  // avec width:auto, Chromium les traite comme de simples ratios. On
  // fournit donc la somme exacte plutôt que de laisser le navigateur
  // deviner.
  const largeurTotale =
    LARGEUR_GOUTTIERE +
    colonnesAffichees.reduce((acc, c) => acc + largeurColonne(preferences, c.id), 0) +
    LARGEUR_ACTIONS;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = lignes.map((l) => l.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(ids, oldIndex, newIndex));
  }

  const groupes = useMemo(() => {
    if (groupBy === "aucun") {
      return [{ cle: null as string | null, numero: null as number | null, lignes }];
    }

    if (groupBy === "categorie") {
      // Chapitres : un chapitre par catégorie, dans l'ordre d'apparition des
      // lignes (comme dans un devis) plutôt que trié par coût — l'ordre des
      // chapitres doit rester stable, indépendamment des montants.
      const ordreCategories: string[] = [];
      for (const l of lignes) {
        const cle = l.categorie || "(non catégorisé)";
        if (!ordreCategories.includes(cle)) ordreCategories.push(cle);
      }
      return ordreCategories.map((cle, index) => ({
        cle,
        numero: index + 1,
        lignes: lignes.filter((l) => (l.categorie || "(non catégorisé)") === cle),
      }));
    }

    // Version / priorité : vue d'analyse, classée par coût décroissant.
    const cleDeGroupe = (l: Ligne) => l.version;
    const parGroupe = calculerTotauxParGroupe(lignes, tauxParType, cleDeGroupe);
    return parGroupe.map((g) => ({
      cle: g.cle,
      numero: null as number | null,
      lignes: lignes.filter((l) => (cleDeGroupe(l) || "(non renseigné)") === g.cle),
    }));
  }, [lignes, groupBy, tauxParType]);

  if (lignes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-12 text-center text-sm text-slate-500">
        {messageVide}
      </div>
    );
  }

  const tableBody = (
    <table
      className="border-collapse text-sm"
      style={{ tableLayout: "fixed", width: largeurTotale }}
    >
      <colgroup>
        <col style={{ width: LARGEUR_GOUTTIERE }} />
        {colonnesAffichees.map((colonne) => (
          <col key={colonne.id} style={{ width: largeurColonne(preferences, colonne.id) }} />
        ))}
        <col style={{ width: LARGEUR_ACTIONS }} />
      </colgroup>
      <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-1 py-2" />
          {colonnesAffichees.map((colonne) => {
            // Le libellé de la colonne "total" dépend de l'unité affichée
            // par cette instance de la grille (UO pour Design/Réalisation…,
            // jours pour les phases qui n'utilisent pas les UO).
            const libelle = colonne.id === "total" ? libelleTotal : colonne.libelle;
            return (
            <th
              key={colonne.id}
              className={cn(
                "relative overflow-hidden px-2 py-2 font-medium",
                colonne.align === "droite" ? "text-right" : "text-left"
              )}
            >
              <span className="block truncate" title={libelle}>
                {libelle}
              </span>
              <ResizeHandle
                orientation="colonne"
                valeur={largeurColonne(preferences, colonne.id)}
                onChange={(v) => onDefinirLargeurColonne(colonne.id, v)}
                onReset={() => onReinitialiserLargeurColonne(colonne.id)}
                ariaLabel={`Largeur de la colonne ${colonne.libelle}`}
                className="absolute right-0 top-0 h-full w-2"
              />
            </th>
            );
          })}
          <th className="px-1 py-2" />
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {groupes.map((groupe) => (
          <GroupeLignes
            key={groupe.cle ?? "all"}
            cle={groupe.cle}
            numero={groupe.numero}
            lignes={groupe.lignes}
            tauxParType={tauxParType}
            groupBy={groupBy}
            reorderEnabled={reorderActif}
            onChangeLigne={onChangeLigne}
            onDeleteLigne={onDeleteLigne}
            onDuplicateLigne={onDuplicateLigne}
            categories={categories}
            versions={versions}
            formaterTotal={formaterTotal}
            colonnesAffichees={colonnesAffichees}
            colSpanGroupe={colSpanGroupe}
            preferences={preferences}
            onDefinirHauteurLigne={onDefinirHauteurLigne}
            onReinitialiserHauteurLigne={onReinitialiserHauteurLigne}
          />
        ))}
      </tbody>
    </table>
  );

  if (!reorderActif) {
    return <div className="flex-1 overflow-auto">{tableBody}</div>;
  }

  return (
    <div className="flex-1 overflow-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={lignes.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {tableBody}
        </SortableContext>
      </DndContext>
    </div>
  );
}

function GroupeLignes({
  cle,
  numero,
  lignes,
  tauxParType,
  groupBy,
  reorderEnabled,
  onChangeLigne,
  onDeleteLigne,
  onDuplicateLigne,
  categories,
  versions,
  formaterTotal,
  colonnesAffichees,
  colSpanGroupe,
  preferences,
  onDefinirHauteurLigne,
  onReinitialiserHauteurLigne,
}: {
  cle: string | null;
  numero: number | null;
  lignes: Ligne[];
  tauxParType: TauxParType;
  groupBy: GroupBy;
  reorderEnabled: boolean;
  onChangeLigne: (ligneId: string, patch: LigneInput) => void;
  onDeleteLigne: (ligne: Ligne) => void;
  onDuplicateLigne: (ligneId: string) => void;
  categories: string[];
  versions: string[];
  formaterTotal: (valeur: number) => string;
  colonnesAffichees: typeof COLONNES_GRILLE_ESTIMATION;
  colSpanGroupe: number;
  preferences: PreferencesGrilleEstimation;
  onDefinirHauteurLigne: (ligneId: string, hauteur: number) => void;
  onReinitialiserHauteurLigne: (ligneId: string) => void;
}) {
  const sousTotal = lignes.reduce((acc, l) => {
    const t = calculerTotauxLigne(l, tauxParType);
    return { jours: acc.jours + t.tempsTotal, cout: acc.cout + t.coutTotal };
  }, { jours: 0, cout: 0 });

  return (
    <>
      {cle !== null && (
        <tr className="bg-slate-50/80">
          <td colSpan={colSpanGroupe} className="px-3 py-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              {groupBy === "categorie" && (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: couleurPourCategorie(cle) }}
                />
              )}
              <span>
                {numero !== null ? (
                  <>
                    <span className="text-slate-400">Chapitre {numero} —</span> {cle}
                  </>
                ) : (
                  cle
                )}
              </span>
              <span className="text-slate-400">
                · {lignes.length} besoin{lignes.length > 1 ? "s" : ""} · {formaterTotal(sousTotal.jours)} ·{" "}
                {formaterEuros(sousTotal.cout)}
              </span>
            </div>
          </td>
        </tr>
      )}
      {lignes.map((ligne) => (
        <Row
          key={ligne.id}
          ligne={ligne}
          tauxParType={tauxParType}
          reorderEnabled={reorderEnabled}
          onChangeLigne={onChangeLigne}
          onDeleteLigne={onDeleteLigne}
          onDuplicateLigne={onDuplicateLigne}
          categories={categories}
          versions={versions}
          formaterTotal={formaterTotal}
          colonnesAffichees={colonnesAffichees}
          hauteur={hauteurLigne(preferences, ligne.id)}
          onDefinirHauteur={(h) => onDefinirHauteurLigne(ligne.id, h)}
          onReinitialiserHauteur={() => onReinitialiserHauteurLigne(ligne.id)}
        />
      ))}
    </>
  );
}

function Row({
  ligne,
  tauxParType,
  reorderEnabled,
  onChangeLigne,
  onDeleteLigne,
  onDuplicateLigne,
  categories,
  versions,
  formaterTotal,
  colonnesAffichees,
  hauteur,
  onDefinirHauteur,
  onReinitialiserHauteur,
}: {
  ligne: Ligne;
  tauxParType: TauxParType;
  reorderEnabled: boolean;
  onChangeLigne: (ligneId: string, patch: LigneInput) => void;
  onDeleteLigne: (ligne: Ligne) => void;
  onDuplicateLigne: (ligneId: string) => void;
  categories: string[];
  versions: string[];
  formaterTotal: (valeur: number) => string;
  colonnesAffichees: typeof COLONNES_GRILLE_ESTIMATION;
  hauteur: number;
  onDefinirHauteur: (hauteur: number) => void;
  onReinitialiserHauteur: () => void;
}) {
  const sortable = useSortable({ id: ligne.id, disabled: !reorderEnabled });
  const style = {
    height: hauteur,
    ...(reorderEnabled
      ? {
          transform: CSS.Transform.toString(sortable.transform),
          transition: sortable.transition,
        }
      : {}),
  };

  const totaux = calculerTotauxLigne(ligne, tauxParType);
  const hauteurTextarea = Math.max(20, hauteur - MARGE_VERTICALE_CELLULE);

  function celluleColonne(id: ColonneId) {
    switch (id) {
      case "besoinClient":
        return (
          <textarea
            value={ligne.besoinClient}
            placeholder="Décrire le besoin exprimé…"
            onChange={(e) => onChangeLigne(ligne.id, { besoinClient: e.target.value })}
            style={{ height: hauteurTextarea }}
            className="w-full resize-none overflow-y-auto rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-slate-900 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 focus:bg-white"
          />
        );
      case "solutionProposee":
        return (
          <textarea
            value={ligne.solutionProposee}
            placeholder="Décrire la solution proposée…"
            onChange={(e) => onChangeLigne(ligne.id, { solutionProposee: e.target.value })}
            style={{ height: hauteurTextarea }}
            className="w-full resize-none overflow-y-auto rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-slate-900 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 focus:bg-white"
          />
        );
      case "categorie":
        return (
          <Combobox
            value={ligne.categorie}
            suggestions={categories}
            onChange={(v) => onChangeLigne(ligne.id, { categorie: v })}
          />
        );
      case "version":
        return (
          <Combobox
            value={ligne.version}
            suggestions={versions}
            onChange={(v) => onChangeLigne(ligne.id, { version: v })}
          />
        );
      case "tempsDesign":
        return (
          <NumberCell
            ariaLabel="Temps design UI"
            value={ligne.tempsDesign}
            onChange={(v) => onChangeLigne(ligne.id, { tempsDesign: v })}
          />
        );
      case "tempsFront":
        return (
          <NumberCell
            ariaLabel="Temps front-end"
            value={ligne.tempsFront}
            onChange={(v) => onChangeLigne(ligne.id, { tempsFront: v })}
          />
        );
      case "tempsBack":
        return (
          <NumberCell
            ariaLabel="Temps back-end"
            value={ligne.tempsBack}
            onChange={(v) => onChangeLigne(ligne.id, { tempsBack: v })}
          />
        );
      case "tempsConfig":
        return (
          <NumberCell
            ariaLabel="Temps configuration"
            value={ligne.tempsConfig}
            onChange={(v) => onChangeLigne(ligne.id, { tempsConfig: v })}
          />
        );
      case "total":
        return (
          <span className="block px-1 text-right font-medium text-slate-700">
            {formaterTotal(totaux.tempsTotal)}
          </span>
        );
      case "coutTotal":
        return (
          <span className="block px-1 text-right font-semibold text-slate-900">
            {formaterEuros(totaux.coutTotal)}
          </span>
        );
    }
  }

  return (
    <tr
      ref={reorderEnabled ? sortable.setNodeRef : undefined}
      style={style}
      className={cn("group align-top", sortable.isDragging && "z-10 bg-white shadow-lg")}
    >
      <td className="relative px-1 py-1.5 text-slate-300">
        {reorderEnabled && (
          <button
            {...sortable.attributes}
            {...sortable.listeners}
            className="cursor-grab touch-none px-1 text-slate-400 hover:text-slate-600 active:cursor-grabbing"
            aria-label="Réordonner la ligne"
          >
            ⠿
          </button>
        )}
        <ResizeHandle
          orientation="ligne"
          valeur={hauteur}
          onChange={onDefinirHauteur}
          onReset={onReinitialiserHauteur}
          ariaLabel="Hauteur de la ligne"
          className="absolute inset-x-0 bottom-0 h-2 opacity-0 group-hover:opacity-100"
        />
      </td>
      {colonnesAffichees.map((colonne) => (
        <td key={colonne.id} className="px-1 py-1.5">
          {celluleColonne(colonne.id)}
        </td>
      ))}
      <td className="px-1 py-1.5">
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            title="Dupliquer la ligne"
            onClick={() => onDuplicateLigne(ligne.id)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ⧉
          </button>
          <button
            title="Supprimer la ligne"
            onClick={() => onDeleteLigne(ligne)}
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
}
