import { NextRequest, NextResponse } from "next/server";
import { creerLigne } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const ligne = creerLigne(id, body);
  return NextResponse.json(ligne, { status: 201 });
}
