// Préférences d'affichage de la grille d'estimation (largeurs de colonnes,
// hauteurs de lignes, colonnes masquées) — volontairement séparées des
// données métier (Ligne, Estimation) : masquer ou redimensionner n'affecte
// jamais le chiffrage, seulement sa présentation.
//
// Persistance en localStorage (par navigateur) faute d'authentification
// (voir docs/decisions/003-auth-authjs-credentials.md) : c'est la meilleure
// approximation possible aujourd'hui d'un réglage "par utilisateur". Le
// format est versionné pour permettre une migration propre vers une table
// serveur (par utilisateur) une fois l'authentification en place, sans
// perdre les préférences déjà enregistrées.

export type ColonneId =
  | "besoinClient"
  | "solutionProposee"
  | "categorie"
  | "version"
  | "tempsDesign"
  | "tempsFront"
  | "tempsBack"
  | "tempsConfig"
  | "total"
  | "coutTotal";

export interface DefinitionColonne {
  id: ColonneId;
  libelle: string;
  largeurDefaut: number;
  largeurMin: number;
  largeurMax: number;
  // Une colonne non masquable ne peut pas être décochée dans le panneau
  // "Colonnes" — voir la justification dans docs/02-spec-fonctionnelle.md.
  masquable: boolean;
  align: "gauche" | "droite";
}

export const COLONNES_GRILLE_ESTIMATION: DefinitionColonne[] = [
  { id: "besoinClient", libelle: "Besoin client", largeurDefaut: 220, largeurMin: 160, largeurMax: 480, masquable: false, align: "gauche" },
  { id: "solutionProposee", libelle: "Réponse au besoin", largeurDefaut: 220, largeurMin: 160, largeurMax: 480, masquable: true, align: "gauche" },
  { id: "categorie", libelle: "Catégorie", largeurDefaut: 140, largeurMin: 100, largeurMax: 320, masquable: true, align: "gauche" },
  { id: "version", libelle: "Version / priorité", largeurDefaut: 150, largeurMin: 100, largeurMax: 320, masquable: true, align: "gauche" },
  { id: "tempsDesign", libelle: "Design UI", largeurDefaut: 80, largeurMin: 56, largeurMax: 160, masquable: true, align: "droite" },
  { id: "tempsFront", libelle: "Front-end", largeurDefaut: 80, largeurMin: 56, largeurMax: 160, masquable: true, align: "droite" },
  { id: "tempsBack", libelle: "Back-end", largeurDefaut: 80, largeurMin: 56, largeurMax: 160, masquable: true, align: "droite" },
  { id: "tempsConfig", libelle: "Configuration", largeurDefaut: 80, largeurMin: 56, largeurMax: 160, masquable: true, align: "droite" },
  { id: "total", libelle: "Temps total", largeurDefaut: 80, largeurMin: 56, largeurMax: 160, masquable: true, align: "droite" },
  { id: "coutTotal", libelle: "Coût de la ligne", largeurDefaut: 112, largeurMin: 80, largeurMax: 220, masquable: true, align: "droite" },
];

export const HAUTEUR_LIGNE_DEFAUT = 56;
export const HAUTEUR_LIGNE_MIN = 40;
export const HAUTEUR_LIGNE_MAX = 400;

export interface PreferencesGrilleEstimation {
  version: 1;
  largeursColonnes: Partial<Record<ColonneId, number>>;
  colonnesMasquees: ColonneId[];
  hauteursLignes: Record<string, number>;
}

const CLE_STOCKAGE = "estimation-ecommerce:grille-preferences:v1";

export function preferencesParDefaut(): PreferencesGrilleEstimation {
  return { version: 1, largeursColonnes: {}, colonnesMasquees: [], hauteursLignes: {} };
}

export function clamp(valeur: number, min: number, max: number): number {
  if (!Number.isFinite(valeur)) return min;
  return Math.min(max, Math.max(min, valeur));
}

export function definitionColonne(id: ColonneId): DefinitionColonne {
  const definition = COLONNES_GRILLE_ESTIMATION.find((c) => c.id === id);
  if (!definition) throw new Error(`Colonne inconnue : ${id}`);
  return definition;
}

export function largeurColonne(
  preferences: PreferencesGrilleEstimation,
  id: ColonneId
): number {
  const definition = definitionColonne(id);
  const valeur = preferences.largeursColonnes[id];
  return valeur === undefined
    ? definition.largeurDefaut
    : clamp(valeur, definition.largeurMin, definition.largeurMax);
}

export function hauteurLigne(
  preferences: PreferencesGrilleEstimation,
  ligneId: string
): number {
  const valeur = preferences.hauteursLignes[ligneId];
  return valeur === undefined ? HAUTEUR_LIGNE_DEFAUT : clamp(valeur, HAUTEUR_LIGNE_MIN, HAUTEUR_LIGNE_MAX);
}

export function colonneVisible(
  preferences: PreferencesGrilleEstimation,
  id: ColonneId
): boolean {
  return !preferences.colonnesMasquees.includes(id);
}

export function avecLargeurColonne(
  preferences: PreferencesGrilleEstimation,
  id: ColonneId,
  largeur: number
): PreferencesGrilleEstimation {
  const definition = definitionColonne(id);
  return {
    ...preferences,
    largeursColonnes: {
      ...preferences.largeursColonnes,
      [id]: clamp(largeur, definition.largeurMin, definition.largeurMax),
    },
  };
}

export function sansLargeurColonne(
  preferences: PreferencesGrilleEstimation,
  id: ColonneId
): PreferencesGrilleEstimation {
  const largeursColonnes = { ...preferences.largeursColonnes };
  delete largeursColonnes[id];
  return { ...preferences, largeursColonnes };
}

export function avecHauteurLigne(
  preferences: PreferencesGrilleEstimation,
  ligneId: string,
  hauteur: number
): PreferencesGrilleEstimation {
  return {
    ...preferences,
    hauteursLignes: {
      ...preferences.hauteursLignes,
      [ligneId]: clamp(hauteur, HAUTEUR_LIGNE_MIN, HAUTEUR_LIGNE_MAX),
    },
  };
}

export function sansHauteurLigne(
  preferences: PreferencesGrilleEstimation,
  ligneId: string
): PreferencesGrilleEstimation {
  const hauteursLignes = { ...preferences.hauteursLignes };
  delete hauteursLignes[ligneId];
  return { ...preferences, hauteursLignes };
}

export function avecColonneMasquee(
  preferences: PreferencesGrilleEstimation,
  id: ColonneId,
  masquee: boolean
): PreferencesGrilleEstimation {
  const definition = definitionColonne(id);
  if (masquee && !definition.masquable) return preferences;
  const ensemble = new Set(preferences.colonnesMasquees);
  if (masquee) ensemble.add(id);
  else ensemble.delete(id);
  return { ...preferences, colonnesMasquees: Array.from(ensemble) };
}

export function avecToutesLesColonnesVisibles(
  preferences: PreferencesGrilleEstimation
): PreferencesGrilleEstimation {
  return { ...preferences, colonnesMasquees: [] };
}

export function sansDimensionsPersonnalisees(
  preferences: PreferencesGrilleEstimation
): PreferencesGrilleEstimation {
  return { ...preferences, largeursColonnes: {}, hauteursLignes: {} };
}

export function chargerPreferences(): PreferencesGrilleEstimation {
  if (typeof window === "undefined") return preferencesParDefaut();
  try {
    const brut = window.localStorage.getItem(CLE_STOCKAGE);
    if (!brut) return preferencesParDefaut();
    const donnees = JSON.parse(brut);
    if (!donnees || donnees.version !== 1) return preferencesParDefaut();
    return {
      version: 1,
      largeursColonnes:
        donnees.largeursColonnes && typeof donnees.largeursColonnes === "object"
          ? donnees.largeursColonnes
          : {},
      colonnesMasquees: Array.isArray(donnees.colonnesMasquees) ? donnees.colonnesMasquees : [],
      hauteursLignes:
        donnees.hauteursLignes && typeof donnees.hauteursLignes === "object"
          ? donnees.hauteursLignes
          : {},
    };
  } catch {
    // JSON invalide, quota dépassé, stockage désactivé (navigation privée
    // stricte)… : on retombe sur les valeurs par défaut plutôt que de
    // bloquer l'affichage de la grille.
    return preferencesParDefaut();
  }
}

export function sauvegarderPreferences(preferences: PreferencesGrilleEstimation): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify(preferences));
  } catch {
    // Idem : on continue sans persister plutôt que de faire échouer l'action
    // de l'utilisateur (redimensionnement, masquage…).
  }
}
