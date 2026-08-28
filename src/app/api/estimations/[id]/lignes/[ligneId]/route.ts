import { NextRequest, NextResponse } from "next/server";
import { modifierLigne, supprimerLigne } from "@/lib/db";

interface Params {
  params: Promise<{ id: string; ligneId: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id, ligneId } = await params;
  const body = await request.json().catch(() => ({}));
  const ligne = modifierLigne(id, ligneId, body);
  if (!ligne) {
    return NextResponse.json({ error: "Ligne introuvable" }, { status: 404 });
  }
  return NextResponse.json(ligne);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id, ligneId } = await params;
  const ok = supprimerLigne(id, ligneId);
  if (!ok) {
    return NextResponse.json({ error: "Ligne introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
