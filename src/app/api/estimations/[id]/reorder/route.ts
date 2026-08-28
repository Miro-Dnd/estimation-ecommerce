import { NextRequest, NextResponse } from "next/server";
import { reordonnerLignes } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const ordreIds: string[] = Array.isArray(body.ordreIds) ? body.ordreIds : [];
  reordonnerLignes(id, ordreIds);
  return NextResponse.json({ ok: true });
}
