"use client";

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
import { formaterEuros, formaterJours } from "@/lib/calculations";
import { useIsClient } from "@/lib/useIsClient";
import { Combobox } from "@/components/ui/Combobox";
import { NumberCell } from "@/components/estimation/EditableCell";
import { BLOCS_CONCEPTION_GENERALE, PROFILS_CONCEPTION_GENERALE } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ConceptionGeneraleTableProps {
  lignes: Ligne[];
  tarifParCode: Map<string, number>;
  onChangeLigne: (ligneId: string, patch: LigneInput) => void;
  onDeleteLigne: (ligne: Ligne) => void;
  onDuplicateLigne: (ligneId: string) => void;
  onReorder: (orderedIds: string[]) => void;
  messageVide: string;
}

export function ConceptionGeneraleTable({
  lignes,
  tarifParCode,
  onChangeLigne,
  onDeleteLigne,
  onDuplicateLigne,
  onReorder,
  messageVide,
}: ConceptionGeneraleTableProps) {
  const monteCote = useIsClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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

  if (lignes.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-center text-sm text-slate-500">
        {messageVide}
      </div>
    );
  }

  const tableBody = (
    <table className="w-full min-w-[900px] border-collapse text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
        <tr>
          {monteCote && <th rowSpan={2} className="w-6 px-2 py-2 align-bottom" />}
          <th rowSpan={2} className="min-w-[200px] px-3 py-2 text-left font-medium align-bottom">
            Tâche
          </th>
          <th rowSpan={2} className="min-w-[200px] px-3 py-2 text-left font-medium align-bottom">
            Description
          </th>
          <th rowSpan={2} className="min-w-[140px] px-3 py-2 text-left font-medium align-bottom">
            Catégorie
          </th>
          <th
            colSpan={PROFILS_CONCEPTION_GENERALE.length}
            className="border-b border-slate-200 px-2 py-1 text-center font-medium"
          >
            En profil
          </th>
          <th rowSpan={2} className="w-20 px-2 py-2 text-right font-medium align-bottom">
            Nb de jours
          </th>
          <th rowSpan={2} className="w-28 px-3 py-2 text-right font-medium align-bottom">
            Budget
          </th>
          <th rowSpan={2} className="w-20 px-2 py-2 align-bottom" />
        </tr>
        <tr>
          {PROFILS_CONCEPTION_GENERALE.map((profil) => (
            <th key={profil.champ} className="w-24 px-2 py-1.5 text-right font-medium">
              {profil.libelle}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {lignes.map((ligne) => (
          <Row
            key={ligne.id}
            ligne={ligne}
            tarifParCode={tarifParCode}
            reorderEnabled={monteCote}
            onChangeLigne={onChangeLigne}
            onDeleteLigne={onDeleteLigne}
            onDuplicateLigne={onDuplicateLigne}
          />
        ))}
      </tbody>
    </table>
  );

  if (!monteCote) {
    return <div className="overflow-x-auto">{tableBody}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={lignes.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {tableBody}
        </SortableContext>
      </DndContext>
    </div>
  );
}

function Row({
  ligne,
  tarifParCode,
  reorderEnabled,
  onChangeLigne,
  onDeleteLigne,
  onDuplicateLigne,
}: {
  ligne: Ligne;
  tarifParCode: Map<string, number>;
  reorderEnabled: boolean;
  onChangeLigne: (ligneId: string, patch: LigneInput) => void;
  onDeleteLigne: (ligne: Ligne) => void;
  onDuplicateLigne: (ligneId: string) => void;
}) {
  const sortable = useSortable({ id: ligne.id, disabled: !reorderEnabled });
  const style = reorderEnabled
    ? { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }
    : undefined;

  const nbJours = PROFILS_CONCEPTION_GENERALE.reduce(
    (acc, p) => acc + ligne[p.champ],
    0
  );
  const budget = PROFILS_CONCEPTION_GENERALE.reduce(
    (acc, p) => acc + ligne[p.champ] * (tarifParCode.get(p.code) ?? 0),
    0
  );

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
          placeholder="Décrire la tâche…"
          onChange={(e) => onChangeLigne(ligne.id, { besoinClient: e.target.value })}
          className="w-full resize-none rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-slate-900 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 focus:bg-white"
        />
      </td>
      <td className="px-1 py-1.5">
        <textarea
          rows={2}
          value={ligne.solutionProposee}
          placeholder="Décrire la description…"
          onChange={(e) => onChangeLigne(ligne.id, { solutionProposee: e.target.value })}
          className="w-full resize-none rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-slate-900 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 focus:bg-white"
        />
      </td>
      <td className="px-1 py-1.5">
        <Combobox
          value={ligne.categorie}
          suggestions={BLOCS_CONCEPTION_GENERALE}
          onChange={(v) => onChangeLigne(ligne.id, { categorie: v })}
        />
      </td>
      {PROFILS_CONCEPTION_GENERALE.map((profil) => (
        <td key={profil.champ} className="px-1 py-1.5">
          <NumberCell
            ariaLabel={profil.libelle}
            value={ligne[profil.champ]}
            onChange={(v) => onChangeLigne(ligne.id, { [profil.champ]: v } as LigneInput)}
          />
        </td>
      ))}
      <td className="px-3 py-2.5 text-right font-medium text-slate-700">
        {formaterJours(nbJours)}
      </td>
      <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
        {formaterEuros(budget)}
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
