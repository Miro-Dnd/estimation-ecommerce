"use client";

import { useRouter } from "next/navigation";
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

export function EstimationUoTab({
  estimationId,
  uoInitial,
  tarifsInitial,
}: {
  estimationId: string;
  uoInitial: ElementUo[];
  tarifsInitial: TarifUo[];
}) {
  const router = useRouter();

  return (
    <RepartitionUoEditor
      titre="UO de ce projet"
      description="Répartition et tarifs propres à cette estimation, initialisés depuis les paramètres généraux à sa création. Les modifier ici n'affecte ni les paramètres généraux, ni les autres estimations."
      pourcentagesInitiaux={uoInitial}
      tarifsInitiaux={tarifsInitial}
      onSavePourcentage={async (cle, type, pourcentage) => {
        await jsonFetch(`/api/estimations/${estimationId}/uo`, {
          method: "PATCH",
          body: JSON.stringify({ cle, type, pourcentage }),
        });
        router.refresh();
      }}
      onSaveTarif={async (cle, tarifJournalier) => {
        await jsonFetch(`/api/estimations/${estimationId}/tarifs`, {
          method: "PATCH",
          body: JSON.stringify({ cle, tarifJournalier }),
        });
        router.refresh();
      }}
    />
  );
}
