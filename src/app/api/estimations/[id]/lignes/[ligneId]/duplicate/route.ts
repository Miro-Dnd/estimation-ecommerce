import { NextRequest, NextResponse } from "next/server";
import { dupliquerLigne } from "@/lib/db";

interface Params {
  params: Promise<{ id: string; ligneId: string }>;
}

export async function POST(_request: NextRequest, { params }: Params) {
  const { id, ligneId } = await params;
  const copie = dupliquerLigne(id, ligneId);
  if (!copie) {
    return NextResponse.json({ error: "Ligne introuvable" }, { status: 404 });
  }
  return NextResponse.json(copie, { status: 201 });
}
