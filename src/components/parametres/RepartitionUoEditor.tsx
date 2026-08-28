"use client";

import { useMemo, useState } from "react";
import type { ElementUo, TarifUo, TypeUo } from "@/types";
import { GROUPES_UO, TYPES_UO } from "@/lib/constants";
import { NumberCell } from "@/components/estimation/EditableCell";
import { useEntitySaver } from "@/lib/useEntitySaver";

function cleEntree(cle: string, type: string) {
  return `${cle}__${type}`;
}

interface RepartitionUoEditorProps {
  titre: string;
  description: string;
  pourcentagesInitiaux: ElementUo[];
  tarifsInitiaux: TarifUo[];
  onSavePourcentage: (cle: string, type: string, pourcentage: number) => Promise<void>;
  onSaveTarif: (cle: string, tarifJournalier: number) => Promise<void>;
}

/**
 * Tableau de répartition UO + tarifs par élément, réutilisé à la fois pour
 * les paramètres globaux (valeurs par défaut) et pour la répartition propre
 * à une estimation (initialisée depuis ces défauts, puis indépendante).
 */
export function RepartitionUoEditor({
  titre,
  description,
  pourcentagesInitiaux,
  tarifsInitiaux,
  onSavePourcentage,
  onSaveTarif,
}: RepartitionUoEditorProps) {
  const [pourcentages, setPourcentages] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const e of pourcentagesInitiaux) map[cleEntree(e.cle, e.type)] = e.pourcentage;
    return map;
  });
  const [tarifs, setTarifs] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const t of tarifsInitiaux) map[t.cle] = t.tarifJournalier;
    return map;
  });

  const saverPourcentages = useEntitySaver<{ pourcentage: number }>(async (entree, patch) => {
    const [cle, type] = entree.split("__");
    await onSavePourcentage(cle, type, patch.pourcentage ?? 0);
  });
  const saverTarifs = useEntitySaver<{ tarifJournalier: number }>(async (cle, patch) => {
    await onSaveTarif(cle, patch.tarifJournalier ?? 0);
  });

  function changerPourcentage(cle: string, type: string, pourcentage: number) {
    setPourcentages((prev) => ({ ...prev, [cleEntree(cle, type)]: pourcentage }));
    saverPourcentages.schedule(cleEntree(cle, type), { pourcentage });
  }

  function changerTarif(cle: string, tarifJournalier: number) {
    setTarifs((prev) => ({ ...prev, [cle]: tarifJournalier }));
    saverTarifs.schedule(cle, { tarifJournalier });
  }

  const tousElements: { cle: string; libelle: string; code: string }[] = useMemo(() => {
    const arr: { cle: string; libelle: string; code: string }[] = [];
    for (const groupe of GROUPES_UO) {
      for (const element of groupe.elements) arr.push(element);
    }
    return arr;
  }, []);

  const totauxParType = useMemo(() => {
    const totaux: Record<string, number> = {};
    for (const type of TYPES_UO) {
      totaux[type.cle] = tousElements.reduce(
        (acc, e) => acc + (pourcentages[cleEntree(e.cle, type.cle)] || 0),
        0
      );
    }
    return totaux;
  }, [pourcentages, tousElements]);

  const enregistrementEnCours = saverPourcentages.isSaving || saverTarifs.isSaving;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{titre}</h1>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <div className="shrink-0 text-right text-xs text-slate-400">
          {enregistrementEnCours ? "Enregistrement…" : "Toutes les modifications sont enregistrées"}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2 text-left font-medium">Élément</th>
              <th className="w-28 px-2 py-2 text-right font-medium">Tarif €/j</th>
              {TYPES_UO.map((type) => (
                <th key={type.cle} className="w-24 px-2 py-2 text-right font-medium">
                  {type.libelle}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {GROUPES_UO.map((groupe) => (
              <GroupeRows
                key={groupe.groupe}
                groupe={groupe.groupe}
                elements={groupe.elements}
                pourcentages={pourcentages}
                tarifs={tarifs}
                onChangePourcentage={changerPourcentage}
                onChangeTarif={changerTarif}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200">
              <td className="px-3 py-2.5 text-right text-sm font-semibold text-slate-600">
                Total
              </td>
              <td />
              {TYPES_UO.map((type) => (
                <td
                  key={type.cle}
                  className={`px-2 py-2.5 text-right text-sm font-semibold ${
                    Math.round(totauxParType[type.cle]) === 100
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }`}
                >
                  {totauxParType[type.cle].toLocaleString("fr-FR", {
                    maximumFractionDigits: 1,
                  })}{" "}
                  %
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function GroupeRows({
  groupe,
  elements,
  pourcentages,
  tarifs,
  onChangePourcentage,
  onChangeTarif,
}: {
  groupe: string;
  elements: readonly { cle: string; libelle: string; code: string }[];
  pourcentages: Record<string, number>;
  tarifs: Record<string, number>;
  onChangePourcentage: (cle: string, type: TypeUo, pourcentage: number) => void;
  onChangeTarif: (cle: string, tarifJournalier: number) => void;
}) {
  return (
    <>
      <tr className="bg-slate-50/80">
        <td colSpan={2 + TYPES_UO.length} className="px-3 py-2 text-xs font-semibold text-slate-600">
          {groupe}
        </td>
      </tr>
      {elements.map((element) => (
        <tr key={element.cle}>
          <td className="px-3 py-2 text-slate-700">
            {element.libelle}{" "}
            <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
              {element.code}
            </span>
          </td>
          <td className="px-1 py-1.5">
            <NumberCell
              ariaLabel={`Tarif journalier — ${element.libelle}`}
              value={tarifs[element.cle] ?? 0}
              step={10}
              onChange={(v) => onChangeTarif(element.cle, v)}
            />
          </td>
          {TYPES_UO.map((type) => (
            <td key={type.cle} className="px-1 py-1.5">
              <NumberCell
                ariaLabel={`${element.libelle} — ${type.libelle}`}
                value={pourcentages[cleEntree(element.cle, type.cle)] ?? 0}
                step={1}
                max={100}
                onChange={(v) => onChangePourcentage(element.cle, type.cle, v)}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
