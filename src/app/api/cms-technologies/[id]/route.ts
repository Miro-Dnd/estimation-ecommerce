import { NextRequest, NextResponse } from "next/server";
import { modifierCmsTechnologie } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const patch: { nom?: string; actif?: boolean } = {};
  if (typeof body.nom === "string") patch.nom = body.nom;
  if (typeof body.actif === "boolean") patch.actif = body.actif;

  try {
    const technologie = modifierCmsTechnologie(id, patch);
    if (!technologie) {
      return NextResponse.json({ error: "Technologie introuvable" }, { status: 404 });
    }
    return NextResponse.json(technologie);
  } catch (err) {
    if (err instanceof Error && err.message === "cms_nom_deja_utilise") {
      return NextResponse.json({ error: "Ce nom existe déjà" }, { status: 409 });
    }
    throw err;
  }
}
