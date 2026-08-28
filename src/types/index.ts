export type Statut = "brouillon" | "final";

export type Phase =
  | "conceptionGenerale"
  | "design"
  | "realisation"
  | "transition"
  | "autresCharges";

export interface Estimation {
  id: string;
  nom: string;
  client: string | null;
  description: string | null;
  cms: string | null;
  tauxJournalier: number;
  statut: Statut;
  createdAt: string;
  updatedAt: string;
}

export interface Ligne {
  id: string;
  estimationId: string;
  ordre: number;
  phase: Phase;
  besoinClient: string;
  solutionProposee: string;
  categorie: string;
  version: string;
  tempsDesign: number;
  tempsFront: number;
  tempsBack: number;
  tempsConfig: number;
  // Temps par profil, saisi directement — utilisé uniquement par les lignes
  // de la phase "Conception générale" (pas de répartition UO pour elle).
  tempsTechExpert: number;
  tempsConsultant: number;
  tempsDesigner: number;
  tempsChefDeProjet: number;
  tempsRespDeProjets: number;
  createdAt: string;
  updatedAt: string;
}

export interface EstimationWithLignes extends Estimation {
  lignes: Ligne[];
  uo: ElementUo[];
  tarifs: TarifUo[];
}

export interface EstimationSummary extends Estimation {
  nombreLignes: number;
  coutTotal: number;
  tempsTotal: number;
}

// Champ modifiable d'une ligne (tout sauf les identifiants/métadonnées)
export type LigneInput = Partial<
  Pick<
    Ligne,
    | "besoinClient"
    | "solutionProposee"
    | "categorie"
    | "version"
    | "tempsDesign"
    | "tempsFront"
    | "tempsBack"
    | "tempsConfig"
    | "tempsTechExpert"
    | "tempsConsultant"
    | "tempsDesigner"
    | "tempsChefDeProjet"
    | "tempsRespDeProjets"
  >
>;

// Entrée de création d'une ligne : comme LigneInput, mais avec la phase à
// laquelle elle appartient (fixée à la création, pas modifiable ensuite ici).
export type LigneCreateInput = LigneInput & { phase?: Phase };

export type TypeUo = "design" | "front" | "back" | "config";

export interface ElementUo {
  cle: string;
  type: TypeUo;
  pourcentage: number;
}

export interface TarifUo {
  cle: string;
  tarifJournalier: number;
}

export interface EstimationInput {
  nom?: string;
  client?: string | null;
  description?: string | null;
  cms?: string | null;
  tauxJournalier?: number;
  statut?: Statut;
}
