"use client";

import Link from "next/link";
import type { ElementUo, TarifUo } from "@/types";
import { RepartitionUoEditor } from "@/components/parametres/RepartitionUoEditor";

async function jsonFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`Requête échouée : ${url}`);
  return res.json();
}

export function ParametresUoEditor({
  elementsInitiaux,
  tarifsInitiaux,
}: {
  elementsInitiaux: ElementUo[];
  tarifsInitiaux: TarifUo[];
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Link
        href="/"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        ← Toutes les estimations
      </Link>

      <RepartitionUoEditor
        titre="Paramètres — Répartition des UO"
        description="Chaque type de temps (Design, Front, Back, Config) a sa propre unité d'œuvre : un tarif journalier par élément de charge, combiné à sa répartition en % pour chaque type. Ces valeurs deviennent les valeurs par défaut de toute nouvelle estimation."
        pourcentagesInitiaux={elementsInitiaux}
        tarifsInitiaux={tarifsInitiaux}
        onSavePourcentage={async (cle, type, pourcentage) => {
          await jsonFetch("/api/parametres-uo", {
            method: "PATCH",
            body: JSON.stringify({ cle, type, pourcentage }),
          });
        }}
        onSaveTarif={async (cle, tarifJournalier) => {
          await jsonFetch("/api/tarifs-uo", {
            method: "PATCH",
            body: JSON.stringify({ cle, tarifJournalier }),
          });
        }}
      />
    </div>
  );
}
