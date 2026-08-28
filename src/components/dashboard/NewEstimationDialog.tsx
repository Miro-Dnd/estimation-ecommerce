"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface NewEstimationDialogProps {
  open: boolean;
  enCours?: boolean;
  onClose: () => void;
  onCreate: (nom: string, client: string) => void;
}

export function NewEstimationDialog({
  open,
  enCours,
  onClose,
  onCreate,
}: NewEstimationDialogProps) {
  const [nom, setNom] = useState("");
  const [client, setClient] = useState("");

  if (!open) return null;

  function submit() {
    if (!nom.trim() || enCours) return;
    onCreate(nom.trim(), client.trim());
    setNom("");
    setClient("");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-900">
          Nouvelle estimation
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Vous pourrez compléter les détails et ajouter des lignes ensuite.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Nom de l&apos;estimation
            </label>
            <Input
              autoFocus
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex : Refonte site X — Phase 1"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Client (optionnel)
            </label>
            <Input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Ex : Client X"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!nom.trim() || enCours}
            onClick={submit}
          >
            Créer
          </Button>
        </div>
      </div>
    </div>
  );
}
