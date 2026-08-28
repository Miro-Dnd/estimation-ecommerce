"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  EstimationInput,
  EstimationWithLignes,
  Ligne,
  LigneInput,
  Phase,
} from "@/types";
import { Input, Textarea } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PhaseTab } from "@/components/estimation/PhaseTab";
import { ConceptionGeneraleTab } from "@/components/estimation/ConceptionGeneraleTab";
import { SyntheseTab } from "@/components/estimation/SyntheseTab";
import { AnalyseTab } from "@/components/estimation/AnalyseTab";
import { EstimationUoTab } from "@/components/estimation/EstimationUoTab";
import { useEntitySaver } from "@/lib/useEntitySaver";
import {
  calculerTauxParType,
  calculerTempsParProfil,
  calculerTjmMoyenProjet,
  formaterEuros,
} from "@/lib/calculations";
import { CMS_SUGGERES, PHASES, TAUX_JOURNALIER_DEFAUT } from "@/lib/constants";
import { cn } from "@/lib/utils";

async function jsonFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`Requête échouée : ${url}`);
  return res.json();
}

type Onglet = "synthese" | Phase | "uo" | "analyse";

const ONGLETS: { cle: Onglet; libelle: string }[] = [
  { cle: "synthese", libelle: "Synthèse" },
  ...PHASES.map((p) => ({ cle: p.cle as Onglet, libelle: p.libelle })),
  { cle: "uo", libelle: "UO" },
  { cle: "analyse", libelle: "Analyse" },
];

export function EstimationEditor({
  estimation: estimationInitiale,
}: {
  estimation: EstimationWithLignes;
}) {
  const router = useRouter();
  const [nom, setNom] = useState(estimationInitiale.nom);
  const [client, setClient] = useState(estimationInitiale.client ?? "");
  const [description, setDescription] = useState(estimationInitiale.description ?? "");
  const [cms, setCms] = useState(estimationInitiale.cms ?? "");
  const [tauxJournalier, setTauxJournalier] = useState(estimationInitiale.tauxJournalier);
  const [statut, setStatut] = useState(estimationInitiale.statut);
  const [lignes, setLignes] = useState<Ligne[]>(estimationInitiale.lignes);
  const [ligneASupprimer, setLigneASupprimer] = useState<Ligne | null>(null);
  const [ajoutEnCours, setAjoutEnCours] = useState(false);
  const [onglet, setOnglet] = useState<Onglet>("synthese");

  const headerSaver = useEntitySaver<EstimationInput>(async (_key, patch) => {
    await jsonFetch(`/api/estimations/${estimationInitiale.id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    router.refresh();
  });

  const ligneSaver = useEntitySaver<LigneInput>(async (ligneId, patch) => {
    await jsonFetch(`/api/estimations/${estimationInitiale.id}/lignes/${ligneId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  });

  const enregistrementEnCours = headerSaver.isSaving || ligneSaver.isSaving;

  function updateHeader(patch: EstimationInput) {
    if ("nom" in patch && patch.nom !== undefined) setNom(patch.nom);
    if ("client" in patch) setClient(patch.client ?? "");
    if ("description" in patch) setDescription(patch.description ?? "");
    if ("cms" in patch) setCms(patch.cms ?? "");
    if ("tauxJournalier" in patch && patch.tauxJournalier !== undefined)
      setTauxJournalier(patch.tauxJournalier);
    if ("statut" in patch && patch.statut !== undefined) setStatut(patch.statut);
    headerSaver.schedule("header", patch);
  }

  function updateLigne(ligneId: string, patch: LigneInput) {
    setLignes((prev) => prev.map((l) => (l.id === ligneId ? { ...l, ...patch } : l)));
    // Le taux journalier peut avoir changé depuis le dernier recalcul : les
    // totaux affichés sont toujours dérivés en direct, jamais stockés.
    ligneSaver.schedule(ligneId, patch);
  }

  async function ajouterLigne(phase: Phase, categorie?: string) {
    setAjoutEnCours(true);
    try {
      const ligne: Ligne = await jsonFetch(
        `/api/estimations/${estimationInitiale.id}/lignes`,
        { method: "POST", body: JSON.stringify({ phase, categorie }) }
      );
      setLignes((prev) => [...prev, ligne]);
    } finally {
      setAjoutEnCours(false);
    }
  }

  async function dupliquerLigne(ligneId: string) {
    const copie: Ligne = await jsonFetch(
      `/api/estimations/${estimationInitiale.id}/lignes/${ligneId}/duplicate`,
      { method: "POST" }
    );
    // On reproduit localement le décalage d'ordre fait côté serveur plutôt
    // que de tout recharger : ça évite d'écraser une modification qu'un
    // autre champ serait en train de sauvegarder (sauvegarde différée).
    setLignes((prev) => {
      const source = prev.find((l) => l.id === ligneId);
      if (!source) return prev;
      const decalees = prev.map((l) =>
        l.ordre > source.ordre ? { ...l, ordre: l.ordre + 1 } : l
      );
      return [...decalees, copie].sort((a, b) => a.ordre - b.ordre);
    });
  }

  function demanderSuppressionLigne(ligne: Ligne) {
    setLigneASupprimer(ligne);
  }

  async function confirmerSuppressionLigne() {
    if (!ligneASupprimer) return;
    const id = ligneASupprimer.id;
    setLigneASupprimer(null);
    // Annule toute sauvegarde encore en attente pour cette ligne : sans ça,
    // une modification tapée juste avant la suppression tenterait de
    // sauvegarder une ligne qui n'existe plus.
    ligneSaver.cancel(id);
    setLignes((prev) => prev.filter((l) => l.id !== id));
    await fetch(`/api/estimations/${estimationInitiale.id}/lignes/${id}`, {
      method: "DELETE",
    });
  }

  function reordonnerLignes(orderedIds: string[]) {
    setLignes((prev) => {
      const byId = new Map(prev.map((l) => [l.id, l]));
      return orderedIds
        .map((id, index) => {
          const ligne = byId.get(id);
          return ligne ? { ...ligne, ordre: index } : null;
        })
        .filter((l): l is Ligne => l !== null);
    });
    fetch(`/api/estimations/${estimationInitiale.id}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ordreIds: orderedIds }),
    });
  }

  // Taux composite par type de temps (Design/Front/Back/Config), dérivé de
  // la répartition UO de cette estimation. Si un type n'a pas de répartition
  // configurée, on retombe sur le taux journalier de l'estimation.
  const tauxParType = useMemo(
    () =>
      calculerTauxParType(
        estimationInitiale.uo,
        estimationInitiale.tarifs,
        tauxJournalier || TAUX_JOURNALIER_DEFAUT
      ),
    [estimationInitiale.uo, estimationInitiale.tarifs, tauxJournalier]
  );

  // Détail des temps par profil (onglet Analyse) : relie chaque élément UO à
  // son profil via le code (ex. "CP"), puis additionne les temps des
  // éléments qui partagent un même profil.
  const tempsParProfil = useMemo(
    () => calculerTempsParProfil(lignes, estimationInitiale.uo, estimationInitiale.tarifs),
    [lignes, estimationInitiale.uo, estimationInitiale.tarifs]
  );

  // Taux journalier moyen affiché dans l'en-tête : moyenne des temps de
  // l'onglet Analyse pondérée par le TJM de chaque profil, pas saisi — il
  // reflète le mix réel de profils mobilisés par cette estimation.
  const tauxMoyenProjet = calculerTjmMoyenProjet(
    tempsParProfil,
    tauxJournalier || TAUX_JOURNALIER_DEFAUT
  );

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      <Link
        href="/"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        ← Toutes les estimations
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Input
              value={nom}
              onChange={(e) => updateHeader({ nom: e.target.value })}
              placeholder="Nom de l'estimation"
              className="border-transparent px-0 text-lg font-semibold hover:border-slate-300 focus:border-indigo-500 focus:px-2.5"
            />
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Client</span>
                <Input
                  value={client}
                  onChange={(e) => updateHeader({ client: e.target.value })}
                  placeholder="Nom du client"
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">CMS</span>
                <Combobox
                  value={cms}
                  suggestions={CMS_SUGGERES}
                  onChange={(v) => updateHeader({ cms: v || null })}
                  placeholder="Ex : Shopify"
                  className="w-40 border-slate-300 hover:border-slate-400"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Taux journalier moyen</span>
                <span className="text-sm font-medium text-slate-700">
                  {formaterEuros(tauxMoyenProjet)} / j
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Statut</span>
                <select
                  value={statut}
                  onChange={(e) =>
                    updateHeader({ statut: e.target.value as "brouillon" | "final" })
                  }
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                >
                  <option value="brouillon">Brouillon</option>
                  <option value="final">Final</option>
                </select>
              </div>
            </div>
          </div>

          <div className="shrink-0 text-right text-xs text-slate-400">
            {enregistrementEnCours ? "Enregistrement…" : "Toutes les modifications sont enregistrées"}
          </div>
        </div>

        <Textarea
          value={description}
          onChange={(e) => updateHeader({ description: e.target.value })}
          placeholder="Contexte du projet, périmètre, hypothèses… (optionnel)"
          rows={2}
          className="mt-3 border-transparent px-0 hover:border-slate-300 focus:border-indigo-500 focus:px-2.5"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-1 border-b border-slate-200">
        {ONGLETS.map((o) => (
          <button
            key={o.cle}
            onClick={() => setOnglet(o.cle)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              onglet === o.cle
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {o.libelle}
          </button>
        ))}
      </div>

      {onglet === "synthese" && (
        <div className="mt-4">
          <SyntheseTab
            lignes={lignes}
            tauxParType={tauxParType}
            tarifs={estimationInitiale.tarifs}
          />
        </div>
      )}

      {onglet === "conceptionGenerale" && (
        <ConceptionGeneraleTab
          lignes={lignes}
          tarifs={estimationInitiale.tarifs}
          ajoutEnCours={ajoutEnCours}
          onAjouterLigne={(categorie) => ajouterLigne("conceptionGenerale", categorie)}
          onChangeLigne={updateLigne}
          onDeleteLigne={demanderSuppressionLigne}
          onDuplicateLigne={dupliquerLigne}
          onReorder={reordonnerLignes}
        />
      )}

      {PHASES.filter((p) => p.cle !== "conceptionGenerale").map(
        (phase) =>
          onglet === phase.cle && (
            <PhaseTab
              key={phase.cle}
              phase={phase.cle}
              lignes={lignes}
              tauxParType={tauxParType}
              ajoutEnCours={ajoutEnCours}
              onAjouterLigne={ajouterLigne}
              onChangeLigne={updateLigne}
              onDeleteLigne={demanderSuppressionLigne}
              onDuplicateLigne={dupliquerLigne}
              onReorder={reordonnerLignes}
            />
          )
      )}

      {onglet === "uo" && (
        <div className="mt-4">
          <EstimationUoTab
            estimationId={estimationInitiale.id}
            uoInitial={estimationInitiale.uo}
            tarifsInitial={estimationInitiale.tarifs}
          />
        </div>
      )}

      {onglet === "analyse" && (
        <div className="mt-4">
          <AnalyseTab tempsParProfil={tempsParProfil} />
        </div>
      )}

      <ConfirmDialog
        open={!!ligneASupprimer}
        title="Supprimer cette ligne ?"
        description={ligneASupprimer?.besoinClient || "Cette ligne sera définitivement supprimée."}
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmerSuppressionLigne}
        onCancel={() => setLigneASupprimer(null)}
      />
    </div>
  );
}
