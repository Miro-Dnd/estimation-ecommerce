import { NextRequest, NextResponse } from "next/server";
import { dupliquerEstimation } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const copie = dupliquerEstimation(id);
  if (!copie) {
    return NextResponse.json({ error: "Estimation introuvable" }, { status: 404 });
  }
  return NextResponse.json(copie, { status: 201 });
}
