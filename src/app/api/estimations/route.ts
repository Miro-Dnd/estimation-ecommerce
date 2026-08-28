import { NextRequest, NextResponse } from "next/server";
import { creerEstimation, listerEstimations } from "@/lib/db";

export async function GET() {
  const estimations = listerEstimations();
  return NextResponse.json(estimations);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const estimation = creerEstimation({
    nom: body.nom,
    client: body.client,
    description: body.description,
    cms: body.cms,
    tauxJournalier: body.tauxJournalier,
  });
  return NextResponse.json(estimation, { status: 201 });
}
