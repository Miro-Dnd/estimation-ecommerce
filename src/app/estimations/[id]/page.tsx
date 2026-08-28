import { notFound } from "next/navigation";
import { obtenirEstimation } from "@/lib/db";
import { EstimationEditor } from "@/components/estimation/EstimationEditor";

// Une estimation est modifiée en continu par son auteur : la page doit
// toujours refléter l'état courant de la base, jamais une version figée au
// build.
export const dynamic = "force-dynamic";

export default async function EstimationPage({
  params,
}: PageProps<"/estimations/[id]">) {
  const { id } = await params;
  const estimation = obtenirEstimation(id);
  if (!estimation) notFound();

  return <EstimationEditor estimation={estimation} />;
}
