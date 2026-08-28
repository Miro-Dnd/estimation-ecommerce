"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { CmsTechnologie, EstimationSummary } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { NewEstimationDialog } from "@/components/dashboard/NewEstimationDialog";
import { formaterEuros, formaterUo } from "@/lib/calculations";

export function EstimationsDashboard({
  estimationsInitiales,
  cmsTechnologies,
}: {
  estimationsInitiales: EstimationSummary[];
  cmsTechnologies: CmsTechnologie[];
}) {
  const router = useRouter();
  const [estimations, setEstimations] = useState(estimationsInitiales);
  const [recherche, setRecherche] = useState("");
  const [dialogCreationOuvert, setDialogCreationOuvert] = useState(false);
  const [aSupprimer, setASupprimer] = useState<EstimationSummary | null>(null);
  const [enCours, setEnCours] = useState(false);

  const estimationsFiltrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return estimations;
    return estimations.filter(
      (e) =>
        e.nom.toLowerCase().includes(q) ||
        (e.client ?? "").toLowerCase().includes(q)
    );
  }, [estimations, recherche]);

  async function creerEstimation(nom: string, client: string, cms: string) {
    setEnCours(true);
    try {
      const res = await fetch("/api/estimations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, client: client || null, cms }),
      });
      const estimation = await res.json();
      router.push(`/estimations/${estimation.id}`);
    } finally {
      setEnCours(false);
    }
  }

  async function dupliquer(id: string) {
    setEnCours(true);
    try {
      const res = await fetch(`/api/estimations/${id}/duplicate`, {
        method: "POST",
      });
      const copie = await res.json();
      const nouvelle: EstimationSummary = {
        ...copie,
        nombreLignes: copie.lignes?.length ?? 0,
        tempsTotal: 0,
        coutTotal: 0,
      };
      setEstimations((prev) => [nouvelle, ...prev]);
    } finally {
      setEnCours(false);
    }
  }

  async function confirmerSuppression() {
    if (!aSupprimer) return;
    const id = aSupprimer.id;
    setASupprimer(null);
    setEstimations((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/estimations/${id}`, { method: "DELETE" });
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Vos estimations
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Créez et chiffrez vos projets e-commerce ligne par ligne.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par nom ou client…"
            className="min-w-[180px] flex-1 sm:w-64 sm:flex-none"
          />
          <Link href="/parametres">
            <Button variant="secondary" className="whitespace-nowrap">
              Paramètres
            </Button>
          </Link>
          <Button
            variant="primary"
            className="whitespace-nowrap"
            onClick={() => setDialogCreationOuvert(true)}
          >
            + Nouvelle estimation
          </Button>
        </div>
      </div>

      {estimationsFiltrees.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-sm font-medium text-slate-700">
            {estimations.length === 0
              ? "Aucune estimation pour l'instant"
              : "Aucun résultat pour cette recherche"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Commencez par créer votre première estimation.
          </p>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => setDialogCreationOuvert(true)}
          >
            + Nouvelle estimation
          </Button>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium text-right">Besoins</th>
                <th className="px-4 py-3 font-medium text-right">Total UO</th>
                <th className="px-4 py-3 font-medium text-right">Coût total</th>
                <th className="px-4 py-3 font-medium">Mis à jour</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {estimationsFiltrees.map((e) => (
                <tr
                  key={e.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => router.push(`/estimations/${e.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {e.nom}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {e.client || <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={e.statut === "final" ? "#059669" : "#d97706"}>
                      {e.statut === "final" ? "Final" : "Brouillon"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {e.nombreLignes}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formaterUo(e.tempsTotal)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formaterEuros(e.coutTotal)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDistanceToNow(new Date(e.updatedAt), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e2) => e2.stopPropagation()}
                  >
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={enCours}
                        onClick={() => dupliquer(e.id)}
                      >
                        Dupliquer
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setASupprimer(e)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewEstimationDialog
        open={dialogCreationOuvert}
        enCours={enCours}
        cmsTechnologies={cmsTechnologies}
        onClose={() => setDialogCreationOuvert(false)}
        onCreate={creerEstimation}
      />

      <ConfirmDialog
        open={!!aSupprimer}
        title={`Supprimer "${aSupprimer?.nom}" ?`}
        description="Cette action supprime définitivement l'estimation et toutes ses lignes."
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmerSuppression}
        onCancel={() => setASupprimer(null)}
      />
    </div>
  );
}
