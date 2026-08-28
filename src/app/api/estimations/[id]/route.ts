import { NextRequest, NextResponse } from "next/server";
import { modifierEstimation, obtenirEstimation, supprimerEstimation } from "@/lib/db";
import type { EstimationInput } from "@/types";

const CHAMPS_MODIFIABLES = [
  "nom",
  "client",
  "description",
  "cms",
  "tauxJournalier",
  "statut",
] as const;

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const estimation = obtenirEstimation(id);
  if (!estimation) {
    return NextResponse.json({ error: "Estimation introuvable" }, { status: 404 });
  }
  return NextResponse.json(estimation);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  // On ne transmet que les champs réellement présents dans la requête : la
  // sauvegarde automatique envoie des patches partiels (un seul champ à la
  // fois), et inclure une clé à `undefined` écraserait la valeur existante.
  const input: EstimationInput = {};
  for (const champ of CHAMPS_MODIFIABLES) {
    if (champ in body) input[champ] = body[champ];
  }
  const estimation = modifierEstimation(id, input);
  if (!estimation) {
    return NextResponse.json({ error: "Estimation introuvable" }, { status: 404 });
  }
  return NextResponse.json(estimation);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const ok = supprimerEstimation(id);
  if (!ok) {
    return NextResponse.json({ error: "Estimation introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
