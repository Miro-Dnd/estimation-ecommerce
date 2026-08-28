"use client";

import { useMemo } from "react";
import type { Ligne, TarifUo } from "@/types";
import {
  TauxParType,
  calculerBilanPhases,
  construireTarifParCode,
  formaterEuros,
} from "@/lib/calculations";
import { PHASES } from "@/lib/constants";

export function SyntheseTab({
  lignes,
  tauxParType,
  tarifs,
}: {
  lignes: Ligne[];
  tauxParType: TauxParType;
  tarifs: TarifUo[];
}) {
  const tarifParCode = useMemo(() => construireTarifParCode(tarifs), [tarifs]);
  const totaux = calculerBilanPhases(lignes, tauxParType, tarifParCode);
  const parPhase = PHASES.map((phase) => {
    const lignesPhase = lignes.filter((l) => l.phase === phase.cle);
    const t = calculerBilanPhases(lignesPhase, tauxParType, tarifParCode);
    return { cle: phase.cle, libelle: phase.libelle, ...t };
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Besoins" value={String(totaux.nombreBesoins)} />
        <Stat label="Coût total" value={formaterEuros(totaux.coutTotal)} highlight />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 text-left font-medium">Phase</th>
              <th className="px-4 py-3 text-right font-medium">Besoins</th>
              <th className="px-4 py-3 text-right font-medium">Coût</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {parPhase.map((p) => (
              <tr key={p.cle}>
                <td className="px-4 py-2.5 text-slate-700">{p.libelle}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{p.nombreBesoins}</td>
                <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                  {formaterEuros(p.coutTotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50">
              <td className="px-4 py-3 font-semibold text-slate-700">Total</td>
              <td className="px-4 py-3 text-right font-semibold text-slate-900">
                {totaux.nombreBesoins}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-slate-900">
                {formaterEuros(totaux.coutTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd
        className={
          highlight
            ? "mt-1 text-2xl font-semibold text-indigo-900"
            : "mt-1 text-xl font-semibold text-slate-900"
        }
      >
        {value}
      </dd>
    </div>
  );
}
