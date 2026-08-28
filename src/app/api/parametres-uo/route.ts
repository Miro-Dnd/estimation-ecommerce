import { NextRequest, NextResponse } from "next/server";
import { listerParametresUo, modifierParametreUo } from "@/lib/db";

export async function GET() {
  const elements = listerParametresUo();
  return NextResponse.json(elements);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { cle, type, pourcentage } = body;
  if (
    typeof cle !== "string" ||
    typeof type !== "string" ||
    typeof pourcentage !== "number"
  ) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  modifierParametreUo(cle, type, pourcentage);
  return NextResponse.json({ ok: true });
}
