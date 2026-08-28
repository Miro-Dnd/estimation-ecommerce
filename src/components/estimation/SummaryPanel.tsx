"use client";

import type { Ligne } from "@/types";
import {
  TauxParType,
  calculerTotauxGlobaux,
  calculerTotauxParGroupe,
  formaterEuros,
  formaterJours,
  formaterUo,
} from "@/lib/calculations";
import { TYPES_UO, couleurPourCategorie } from "@/lib/constants";

interface SummaryPanelProps {
  lignes: Ligne[];
  tauxParType: TauxParType;
}

export function SummaryPanel({ lignes, tauxParType }: SummaryPanelProps) {
  const totaux = calculerTotauxGlobaux(lignes, tauxParType);
  const parCategorie = calculerTotauxParGroupe(
    lignes,
    tauxParType,
    (l) => l.categorie
  );
  const parVersion = calculerTotauxParGroupe(lignes, tauxParType, (l) => l.version);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Synthèse globale
        </h2>

        <dl className="mt-3 grid grid-cols-2 gap-3">
          <Stat label="Besoins" value={String(totaux.nombreBesoins)} />
          <Stat label="Total UO" value={formaterUo(totaux.totalJours)} />
          <Stat label="Design UI" value={formaterJours(totaux.totalDesign)} />
          <Stat label="Front-end" value={formaterJours(totaux.totalFront)} />
          <Stat label="Back-end" value={formaterJours(totaux.totalBack)} />
          <Stat label="Configuration" value={formaterJours(totaux.totalConfig)} />
        </dl>

        <div className="mt-4 rounded-lg bg-indigo-50 p-3">
          <p className="text-xs font-medium text-indigo-700">Coût total du projet</p>
          <p className="mt-0.5 text-2xl font-semibold text-indigo-900">
            {formaterEuros(totaux.coutTotal)}
          </p>
          <p className="mt-0.5 text-xs text-indigo-600">
            {TYPES_UO.map(
              (type) => `${type.libelle} ${formaterEuros(tauxParType[type.cle])}/j`
            ).join(" · ")}
          </p>
        </div>
      </div>

      <GroupeCard titre="Par catégorie" groupes={parCategorie} couleurs />
      <GroupeCard titre="Par version / priorité" groupes={parVersion} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-base font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function GroupeCard({
  titre,
  groupes,
  couleurs,
}: {
  titre: string;
  groupes: { cle: string; nombreBesoins: number; totalJours: number; coutTotal: number }[];
  couleurs?: boolean;
}) {
  if (groupes.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {titre}
      </h2>
      <ul className="mt-3 space-y-2.5">
        {groupes.map((g) => (
          <li key={g.cle} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-1.5 truncate text-slate-700">
              {couleurs && (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: couleurPourCategorie(g.cle) }}
                />
              )}
              <span className="truncate">{g.cle}</span>
              <span className="shrink-0 text-xs text-slate-400">
                ({g.nombreBesoins})
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="font-medium text-slate-900">
                {formaterEuros(g.coutTotal)}
              </span>
              <span className="ml-1.5 text-xs text-slate-400">
                {formaterUo(g.totalJours)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
