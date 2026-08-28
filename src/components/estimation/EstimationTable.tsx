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
import { Combobox } from "@/components/ui/Combobox";
import { NumberCell } from "@/components/estimation/EditableCell";
import { CATEGORIES_SUGGEREES, VERSIONS_SUGGEREES, couleurPourCategorie } from "@/lib/constants";
import type { GroupBy } from "@/components/estimation/FiltersBar";
import { cn } from "@/lib/utils";

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
}

const COLONNES = 12;

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
    <table className="w-full min-w-[1240px] border-collapse text-sm">
      <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
        <tr>
          {reorderActif && <th className="w-6 px-2 py-2" />}
          <th className="min-w-[220px] px-3 py-2 text-left font-medium">Besoin client</th>
          <th className="min-w-[220px] px-3 py-2 text-left font-medium">Solution proposée</th>
          <th className="min-w-[140px] px-3 py-2 text-left font-medium">Catégorie</th>
          <th className="min-w-[150px] px-3 py-2 text-left font-medium">Version / priorité</th>
          <th className="w-20 px-2 py-2 text-right font-medium">Design</th>
          <th className="w-20 px-2 py-2 text-right font-medium">Front</th>
          <th className="w-20 px-2 py-2 text-right font-medium">Back</th>
          <th className="w-20 px-2 py-2 text-right font-medium">Config</th>
          <th className="w-20 px-2 py-2 text-right font-medium">{libelleTotal}</th>
          <th className="w-28 px-3 py-2 text-right font-medium">Coût total</th>
          <th className="w-20 px-2 py-2" />
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
}) {
  const sousTotal = lignes.reduce((acc, l) => {
    const t = calculerTotauxLigne(l, tauxParType);
    return { jours: acc.jours + t.tempsTotal, cout: acc.cout + t.coutTotal };
  }, { jours: 0, cout: 0 });

  return (
    <>
      {cle !== null && (
        <tr className="bg-slate-50/80">
          <td colSpan={COLONNES} className="px-3 py-2">
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
}) {
  const sortable = useSortable({ id: ligne.id, disabled: !reorderEnabled });
  const style = reorderEnabled
    ? {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }
    : undefined;

  const totaux = calculerTotauxLigne(ligne, tauxParType);

  return (
    <tr
      ref={reorderEnabled ? sortable.setNodeRef : undefined}
      style={style}
      className={cn("group align-top", sortable.isDragging && "z-10 bg-white shadow-lg")}
    >
      {reorderEnabled && (
        <td className="px-2 py-2 text-slate-300">
          <button
            {...sortable.attributes}
            {...sortable.listeners}
            className="cursor-grab touch-none px-1 text-slate-400 hover:text-slate-600 active:cursor-grabbing"
            aria-label="Réordonner la ligne"
          >
            ⠿
          </button>
        </td>
      )}
      <td className="px-1 py-1.5">
        <textarea
          rows={2}
          value={ligne.besoinClient}
          placeholder="Décrire le besoin exprimé…"
          onChange={(e) => onChangeLigne(ligne.id, { besoinClient: e.target.value })}
          className="w-full resize-none rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-slate-900 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 focus:bg-white"
        />
      </td>
      <td className="px-1 py-1.5">
        <textarea
          rows={2}
          value={ligne.solutionProposee}
          placeholder="Décrire la solution proposée…"
          onChange={(e) => onChangeLigne(ligne.id, { solutionProposee: e.target.value })}
          className="w-full resize-none rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-slate-900 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 focus:bg-white"
        />
      </td>
      <td className="px-1 py-1.5">
        <Combobox
          value={ligne.categorie}
          suggestions={categories}
          onChange={(v) => onChangeLigne(ligne.id, { categorie: v })}
        />
      </td>
      <td className="px-1 py-1.5">
        <Combobox
          value={ligne.version}
          suggestions={versions}
          onChange={(v) => onChangeLigne(ligne.id, { version: v })}
        />
      </td>
      <td className="px-1 py-1.5">
        <NumberCell
          ariaLabel="Temps design UI"
          value={ligne.tempsDesign}
          onChange={(v) => onChangeLigne(ligne.id, { tempsDesign: v })}
        />
      </td>
      <td className="px-1 py-1.5">
        <NumberCell
          ariaLabel="Temps front-end"
          value={ligne.tempsFront}
          onChange={(v) => onChangeLigne(ligne.id, { tempsFront: v })}
        />
      </td>
      <td className="px-1 py-1.5">
        <NumberCell
          ariaLabel="Temps back-end"
          value={ligne.tempsBack}
          onChange={(v) => onChangeLigne(ligne.id, { tempsBack: v })}
        />
      </td>
      <td className="px-1 py-1.5">
        <NumberCell
          ariaLabel="Temps configuration"
          value={ligne.tempsConfig}
          onChange={(v) => onChangeLigne(ligne.id, { tempsConfig: v })}
        />
      </td>
      <td className="px-3 py-2.5 text-right font-medium text-slate-700">
        {formaterTotal(totaux.tempsTotal)}
      </td>
      <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
        {formaterEuros(totaux.coutTotal)}
      </td>
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
