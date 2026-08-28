"use client";

import type { TempsProfil } from "@/lib/calculations";
import { formaterEuros, formaterUo } from "@/lib/calculations";

export function AnalyseTab({ tempsParProfil }: { tempsParProfil: TempsProfil[] }) {
  const totalTemps = tempsParProfil.reduce((acc, p) => acc + p.temps, 0);
  const totalCout = tempsParProfil.reduce((acc, p) => acc + p.coutTotal, 0);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 text-left font-medium">Profil</th>
            <th className="px-4 py-3 text-right font-medium">Temps</th>
            <th className="px-4 py-3 text-right font-medium">TJM</th>
            <th className="px-4 py-3 text-right font-medium">Coût</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tempsParProfil.map((p) => (
            <tr key={p.code}>
              <td className="px-4 py-2.5 text-slate-700">
                {p.nom}{" "}
                <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                  {p.code}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right text-slate-600">
                {formaterUo(p.temps)}
              </td>
              <td className="px-4 py-2.5 text-right text-slate-600">
                {formaterEuros(p.tarifJournalier)}
              </td>
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
              {formaterUo(totalTemps)}
            </td>
            <td />
            <td className="px-4 py-3 text-right font-semibold text-slate-900">
              {formaterEuros(totalCout)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
