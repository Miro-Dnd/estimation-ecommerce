import { NextRequest, NextResponse } from "next/server";
import { listerTarifsUo, modifierTarifUo } from "@/lib/db";

export async function GET() {
  const tarifs = listerTarifsUo();
  return NextResponse.json(tarifs);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { cle, tarifJournalier } = body;
  if (typeof cle !== "string" || typeof tarifJournalier !== "number") {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  modifierTarifUo(cle, tarifJournalier);
  return NextResponse.json({ ok: true });
}
