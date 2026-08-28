import { listerEstimations } from "@/lib/db";
import { EstimationsDashboard } from "@/components/dashboard/EstimationsDashboard";

// Les estimations sont modifiées en continu (création, suppression, édition) :
// la page doit toujours refléter l'état courant de la base, jamais une version
// mise en cache au build.
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const estimations = listerEstimations();
  return <EstimationsDashboard estimationsInitiales={estimations} />;
}
