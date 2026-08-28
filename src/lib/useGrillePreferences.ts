"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  ColonneId,
  PreferencesGrilleEstimation,
  avecColonneMasquee,
  avecHauteurLigne,
  avecLargeurColonne,
  avecToutesLesColonnesVisibles,
  chargerPreferences,
  preferencesParDefaut,
  sansDimensionsPersonnalisees,
  sansHauteurLigne,
  sansLargeurColonne,
  sauvegarderPreferences,
} from "@/lib/grillePreferences";

// Store externe minimal (mémoire de process, pas de librairie) : les
// préférences sont partagées par toute l'application (une seule grille à la
// fois est montée aujourd'hui, mais rien n'empêche plusieurs instances de
// rester synchronisées). Suit le même principe que useIsClient : le rendu
// serveur voit toujours les valeurs par défaut (getServerSnapshot), la
// vraie valeur n'est lue depuis localStorage qu'après le montage côté
// client — jamais de setState dans un effet.
const abonnes = new Set<() => void>();
let etatActuel: PreferencesGrilleEstimation | null = null;

function instantane(): PreferencesGrilleEstimation {
  if (etatActuel === null) etatActuel = chargerPreferences();
  return etatActuel;
}

function instantaneServeur(): PreferencesGrilleEstimation {
  return preferencesParDefaut();
}

function sAbonner(ecouteur: () => void): () => void {
  abonnes.add(ecouteur);
  return () => abonnes.delete(ecouteur);
}

function definirEtat(suivantes: PreferencesGrilleEstimation): void {
  etatActuel = suivantes;
  sauvegarderPreferences(suivantes);
  abonnes.forEach((ecouteur) => ecouteur());
}

export function useGrillePreferences() {
  const preferences = useSyncExternalStore(sAbonner, instantane, instantaneServeur);

  const appliquer = useCallback(
    (transformation: (preferences: PreferencesGrilleEstimation) => PreferencesGrilleEstimation) => {
      definirEtat(transformation(instantane()));
    },
    []
  );

  return {
    preferences,
    definirLargeurColonne: useCallback(
      (id: ColonneId, largeur: number) =>
        appliquer((p) => avecLargeurColonne(p, id, largeur)),
      [appliquer]
    ),
    reinitialiserLargeurColonne: useCallback(
      (id: ColonneId) => appliquer((p) => sansLargeurColonne(p, id)),
      [appliquer]
    ),
    definirHauteurLigne: useCallback(
      (ligneId: string, hauteur: number) =>
        appliquer((p) => avecHauteurLigne(p, ligneId, hauteur)),
      [appliquer]
    ),
    reinitialiserHauteurLigne: useCallback(
      (ligneId: string) => appliquer((p) => sansHauteurLigne(p, ligneId)),
      [appliquer]
    ),
    basculerColonne: useCallback(
      (id: ColonneId, masquee: boolean) => appliquer((p) => avecColonneMasquee(p, id, masquee)),
      [appliquer]
    ),
    afficherToutesLesColonnes: useCallback(
      () => appliquer(avecToutesLesColonnesVisibles),
      [appliquer]
    ),
    reinitialiserDimensions: useCallback(
      () => appliquer(sansDimensionsPersonnalisees),
      [appliquer]
    ),
  };
}
