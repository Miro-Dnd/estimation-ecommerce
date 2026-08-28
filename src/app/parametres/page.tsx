import { listerParametresUo, listerTarifsUo } from "@/lib/db";
import { ParametresUoEditor } from "@/components/parametres/ParametresUoEditor";

export const dynamic = "force-dynamic";

export default function ParametresPage() {
  const elements = listerParametresUo();
  const tarifs = listerTarifsUo();
  return <ParametresUoEditor elementsInitiaux={elements} tarifsInitiaux={tarifs} />;
}
