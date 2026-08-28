"use client";

import { useState } from "react";
import type { CmsTechnologie } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

async function jsonFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? `Requête échouée : ${url}`);
  }
  return body;
}

export function CmsTechnologiesEditor({
  technologiesInitiales,
}: {
  technologiesInitiales: CmsTechnologie[];
}) {
  const [technologies, setTechnologies] = useState(technologiesInitiales);
  const [nouveauNom, setNouveauNom] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function ajouter() {
    const nom = nouveauNom.trim();
    if (!nom || enCours) return;
    setEnCours(true);
    setErreur(null);
    try {
      const technologie = await jsonFetch("/api/cms-technologies", {
        method: "POST",
        body: JSON.stringify({ nom }),
      });
      setTechnologies((prev) => [...prev, technologie]);
      setNouveauNom("");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setEnCours(false);
    }
  }

  async function basculerActif(technologie: CmsTechnologie) {
    const actif = !technologie.actif;
    setTechnologies((prev) =>
      prev.map((t) => (t.id === technologie.id ? { ...t, actif } : t))
    );
    try {
      await jsonFetch(`/api/cms-technologies/${technologie.id}`, {
        method: "PATCH",
        body: JSON.stringify({ actif }),
      });
    } catch {
      // Retour à l'état précédent si la sauvegarde échoue côté serveur.
      setTechnologies((prev) =>
        prev.map((t) => (t.id === technologie.id ? { ...t, actif: !actif } : t))
      );
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">CMS / Technologies</h2>
      <p className="mt-1 text-sm text-slate-500">
        Liste administrable proposée à la création d&apos;une estimation.
        Désactiver une technologie la retire de la liste proposée sans
        toucher aux estimations qui la référencent déjà.
      </p>

      <ul className="mt-4 divide-y divide-slate-100">
        {technologies.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 py-2">
            <span
              className={
                t.actif ? "text-sm text-slate-800" : "text-sm text-slate-400 line-through"
              }
            >
              {t.nom}
            </span>
            <Button size="sm" variant="secondary" onClick={() => basculerActif(t)}>
              {t.actif ? "Désactiver" : "Réactiver"}
            </Button>
          </li>
        ))}
        {technologies.length === 0 && (
          <li className="py-2 text-sm text-slate-400">Aucune technologie configurée.</li>
        )}
      </ul>

      <div className="mt-4 flex items-center gap-2">
        <Input
          value={nouveauNom}
          onChange={(e) => setNouveauNom(e.target.value)}
          placeholder="Nouvelle technologie (ex : Sylius)"
          onKeyDown={(e) => e.key === "Enter" && ajouter()}
          className="max-w-xs"
        />
        <Button
          size="sm"
          variant="primary"
          disabled={!nouveauNom.trim() || enCours}
          onClick={ajouter}
        >
          Ajouter
        </Button>
      </div>
      {erreur && <p className="mt-2 text-sm text-red-600">{erreur}</p>}
    </div>
  );
}
