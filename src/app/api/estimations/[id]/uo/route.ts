import { NextRequest, NextResponse } from "next/server";
import { modifierUoEstimation } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { cle, type, pourcentage } = body;
  if (
    typeof cle !== "string" ||
    typeof type !== "string" ||
    typeof pourcentage !== "number"
  ) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  modifierUoEstimation(id, cle, type, pourcentage);
  return NextResponse.json({ ok: true });
}
