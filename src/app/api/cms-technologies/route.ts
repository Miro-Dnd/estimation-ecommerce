import { NextRequest, NextResponse } from "next/server";
import { creerCmsTechnologie, listerCmsTechnologies } from "@/lib/db";

export async function GET() {
  return NextResponse.json(listerCmsTechnologies());
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (typeof body.nom !== "string" || !body.nom.trim()) {
    return NextResponse.json({ error: "Le nom est obligatoire" }, { status: 400 });
  }
  try {
    const technologie = creerCmsTechnologie(body.nom);
    return NextResponse.json(technologie, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "cms_nom_deja_utilise") {
      return NextResponse.json({ error: "Ce nom existe déjà" }, { status: 409 });
    }
    throw err;
  }
}
