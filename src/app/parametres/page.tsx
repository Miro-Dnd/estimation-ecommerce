import Link from "next/link";
import { listerCmsTechnologies, listerParametresUo, listerTarifsUo } from "@/lib/db";
import { ParametresUoEditor } from "@/components/parametres/ParametresUoEditor";
import { CmsTechnologiesEditor } from "@/components/parametres/CmsTechnologiesEditor";

export const dynamic = "force-dynamic";

export default function ParametresPage() {
  const elements = listerParametresUo();
  const tarifs = listerTarifsUo();
  const cmsTechnologies = listerCmsTechnologies();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        ← Toutes les estimations
      </Link>

      <CmsTechnologiesEditor technologiesInitiales={cmsTechnologies} />
      <ParametresUoEditor elementsInitiaux={elements} tarifsInitiaux={tarifs} />
    </div>
  );
}
