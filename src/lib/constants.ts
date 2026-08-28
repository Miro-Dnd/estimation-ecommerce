// Suggestions par défaut — champs libres pour ne pas bloquer l'utilisateur,
// mais avec des valeurs cohérentes proposées d'emblée.

export const CATEGORIES_SUGGEREES = [
  "Catalogue",
  "Checkout",
  "Paiement",
  "CMS",
  "Compte client",
  "Recherche",
  "Livraison",
  "Intégration",
  "Administration",
  "Marketing",
  "Autre",
] as const;

export const VERSIONS_SUGGEREES = [
  "V1",
  "V2",
  "V3",
  "Priorité haute",
  "Priorité moyenne",
  "Priorité basse",
] as const;

export const CMS_SUGGERES = [
  "Adobe Commerce",
  "Shopify",
  "Magento Open Source",
  "PrestaShop",
  "WooCommerce",
  "Salesforce Commerce Cloud",
  "SAP Commerce Cloud",
  "BigCommerce",
  "Sylius",
] as const;

export const TAUX_JOURNALIER_DEFAUT = 550;

export const COULEURS_CATEGORIE: Record<string, string> = {
  Catalogue: "#2563eb",
  Checkout: "#7c3aed",
  Paiement: "#dc2626",
  CMS: "#0891b2",
  "Compte client": "#059669",
  Recherche: "#d97706",
  Livraison: "#65a30d",
  Intégration: "#db2777",
  Administration: "#475569",
  Marketing: "#ea580c",
};

export function couleurPourCategorie(categorie: string): string {
  return COULEURS_CATEGORIE[categorie] ?? "#64748b";
}

// Phases du projet : chaque ligne de besoin appartient à l'une d'elles, et
// chaque phase a son propre onglet (tableau de lignes indépendant) dans
// l'estimation, dans cet ordre.
export const PHASES = [
  { cle: "conceptionGenerale", libelle: "Conception générale" },
  { cle: "design", libelle: "Design" },
  { cle: "realisation", libelle: "Réalisation" },
  { cle: "transition", libelle: "Transition" },
  { cle: "autresCharges", libelle: "Autres charges" },
] as const;

export const PHASE_DEFAUT = "realisation";

// La phase "Conception générale" a une structure fixe : un bloc visuel par
// titre, chacun avec son propre tableau de lignes — contrairement aux autres
// phases, groupées dynamiquement par la catégorie libre de leurs lignes.
export const BLOCS_CONCEPTION_GENERALE = [
  "Initialisation du projet",
  "Conception fonctionnelle",
  "Conception technique",
  "Restitution",
  "Pilotage",
] as const;

// Colonnes "par profil" du tableau de Conception générale : cette phase ne
// passe pas par la répartition UO, le temps de chaque profil est saisi
// directement, ligne par ligne. Le code relie chaque colonne au tarif
// journalier de son profil (cf. PROFILS_UO / GROUPES_UO).
export const PROFILS_CONCEPTION_GENERALE = [
  { champ: "tempsTechExpert", code: "TE", libelle: "Tech Expert" },
  { champ: "tempsConsultant", code: "CLT", libelle: "Consultant" },
  { champ: "tempsDesigner", code: "UXUI", libelle: "Designer" },
  { champ: "tempsChefDeProjet", code: "CP", libelle: "Chef de projet" },
  { champ: "tempsRespDeProjets", code: "RP", libelle: "Resp. de projets" },
] as const;

// Référentiel des profils (métiers) identifiés par leur code — le même code
// que celui porté par les éléments UO (cf. GROUPES_UO ci-dessous), ce qui
// permet de relier une activité UO à un profil pour l'onglet Analyse.
export const PROFILS_UO = [
  { code: "RP", nom: "Resp. de projets" },
  { code: "CP", nom: "Chef de projet" },
  { code: "CLT", nom: "Consultant" },
  { code: "TE", nom: "Tech Expert" },
  { code: "TL", nom: "Tech Lead" },
  { code: "DEV-F", nom: "Développeur Front" },
  { code: "DEV-B", nom: "Développeur Back" },
  { code: "DA", nom: "Directeur Artistique" },
  { code: "UXUI", nom: "Designer" },
  { code: "QA", nom: "Testeur" },
  { code: "FRM", nom: "Formateur" },
  { code: "ACC", nom: "Expert accessibilité" },
] as const;

// Chaque type de temps de ligne (Design/Front/Back/Config) a sa propre UO,
// donc sa propre répartition en % sur les éléments ci-dessous.
export const TYPES_UO = [
  { cle: "design", libelle: "Design" },
  { cle: "front", libelle: "Front" },
  { cle: "back", libelle: "Back" },
  { cle: "config", libelle: "Config" },
] as const;

// Répartition des UO (unités d'œuvre) : structure fixe utilisée pour afficher
// et éditer le tableau de paramétrage. Chaque élément a une clé stable
// (stockée en base) et un libellé (affiché) ; les groupes sont de simples
// séparateurs visuels, pas des lignes éditables.
export const GROUPES_UO = [
  {
    groupe: "Réalisation",
    elements: [
      { cle: "designUi", libelle: "Design UI", code: "UXUI", tarifDefaut: 650 },
      { cle: "consultant", libelle: "Consultant", code: "CLT", tarifDefaut: 900 },
      {
        cle: "developpementBack",
        libelle: "Développement Back",
        code: "DEV-B",
        tarifDefaut: 750,
      },
      {
        cle: "developpementFront",
        libelle: "Développement Front",
        code: "DEV-F",
        tarifDefaut: 750,
      },
    ],
  },
  {
    groupe: "Charges connexes de pilotage",
    elements: [
      { cle: "gestionDeProjet", libelle: "Gestion de projet", code: "CP", tarifDefaut: 750 },
      {
        cle: "gestionDeProjetTechnique",
        libelle: "Gestion de projet technique",
        code: "TL",
        tarifDefaut: 850,
      },
      { cle: "directionDeProjet", libelle: "Direction de Projet", code: "RP", tarifDefaut: 850 },
      { cle: "expertiseTechnique", libelle: "Expertise technique", code: "TE", tarifDefaut: 900 },
      { cle: "expertiseDesign", libelle: "Expertise design", code: "DA", tarifDefaut: 850 },
    ],
  },
  {
    groupe: "Charges connexes de spécification",
    elements: [
      {
        cle: "specificationsFonctionnellesDetaillees",
        libelle: "Spécifications fonctionnelles détaillées",
        code: "CLT",
        tarifDefaut: 900,
      },
      {
        cle: "specificationsTechniques",
        libelle: "Spécifications techniques",
        code: "TL",
        tarifDefaut: 850,
      },
      {
        cle: "specificationsVisuelles",
        libelle: "Spécifications visuelles",
        code: "UXUI",
        tarifDefaut: 650,
      },
    ],
  },
  {
    groupe: "Charges connexes de recette",
    elements: [
      { cle: "recetteInterne", libelle: "Recette interne", code: "QA", tarifDefaut: 650 },
      {
        cle: "assistanceRecetteClient",
        libelle: "Assistance à la recette client",
        code: "CP",
        tarifDefaut: 750,
      },
    ],
  },
] as const;
