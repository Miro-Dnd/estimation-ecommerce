import { NextRequest, NextResponse } from "next/server";
import { modifierTarifEstimation } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { cle, tarifJournalier } = body;
  if (typeof cle !== "string" || typeof tarifJournalier !== "number") {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  modifierTarifEstimation(id, cle, tarifJournalier);
  return NextResponse.json({ ok: true });
}
