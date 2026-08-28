import type { ElementUo, Ligne, TarifUo, TypeUo } from "@/types";
import { GROUPES_UO, PROFILS_CONCEPTION_GENERALE, PROFILS_UO, TYPES_UO } from "@/lib/constants";

/**
 * Tarif journalier par code de profil, dérivé des tarifs par élément UO
 * (plusieurs éléments peuvent partager un même profil — ex. Chef de projet
 * pilote à la fois "Gestion de projet" et "Assistance à la recette client" ;
 * on prend le tarif du premier élément rencontré pour ce code).
 */
export function construireTarifParCode(tarifs: TarifUo[]): Map<string, number> {
  const tarifParCle = new Map(tarifs.map((t) => [t.cle, t.tarifJournalier]));
  const tarifParCode = new Map<string, number>();
  for (const groupe of GROUPES_UO) {
    for (const element of groupe.elements) {
      if (!tarifParCode.has(element.code)) {
        tarifParCode.set(element.code, tarifParCle.get(element.cle) ?? 0);
      }
    }
  }
  return tarifParCode;
}

export type TauxParType = Record<TypeUo, number>;

/**
 * Calcule, pour chaque type de temps (Design/Front/Back/Config), le taux
 * journalier composite issu de sa répartition UO : Σ(% élément × tarif
 * élément). Si un type n'a aucune répartition configurée (100% à 0), on
 * retombe sur le taux journalier de l'estimation plutôt que de facturer ce
 * temps à 0€.
 */
export function calculerTauxParType(
  uo: ElementUo[],
  tarifs: TarifUo[],
  tauxJournalierParDefaut: number
): TauxParType {
  const tarifParCle = new Map(tarifs.map((t) => [t.cle, t.tarifJournalier]));
  const resultat = {} as TauxParType;

  for (const type of TYPES_UO) {
    const elementsDuType = uo.filter((u) => u.type === type.cle);
    const totalPourcentage = elementsDuType.reduce((acc, u) => acc + u.pourcentage, 0);
    if (totalPourcentage <= 0) {
      resultat[type.cle] = tauxJournalierParDefaut;
      continue;
    }
    resultat[type.cle] = elementsDuType.reduce(
      (acc, u) => acc + (u.pourcentage / 100) * (tarifParCle.get(u.cle) ?? 0),
      0
    );
  }

  return resultat;
}

export interface TotauxLigne {
  tempsTotal: number;
  coutTotal: number;
}

export function calculerTotauxLigne(ligne: Ligne, tauxParType: TauxParType): TotauxLigne {
  const tempsTotal =
    ligne.tempsDesign + ligne.tempsFront + ligne.tempsBack + ligne.tempsConfig;
  const coutTotal =
    ligne.tempsDesign * tauxParType.design +
    ligne.tempsFront * tauxParType.front +
    ligne.tempsBack * tauxParType.back +
    ligne.tempsConfig * tauxParType.config;
  return { tempsTotal, coutTotal };
}

/**
 * Conception générale ne passe pas par les UO : le temps de chaque profil y
 * est saisi directement, ligne par ligne, et son coût dérive du tarif de ce
 * profil plutôt que d'un taux composite Design/Front/Back/Config. Ce
 * dispatcher permet aux vues qui mélangent toutes les phases (Synthèse,
 * liste des estimations) de totaliser correctement, quelle que soit la
 * phase de chaque ligne.
 */
export function calculerTotauxLigneUnifie(
  ligne: Ligne,
  tauxParType: TauxParType,
  tarifParCode: Map<string, number>
): TotauxLigne {
  if (ligne.phase === "conceptionGenerale") {
    let tempsTotal = 0;
    let coutTotal = 0;
    for (const profil of PROFILS_CONCEPTION_GENERALE) {
      const temps = ligne[profil.champ];
      tempsTotal += temps;
      coutTotal += temps * (tarifParCode.get(profil.code) ?? 0);
    }
    return { tempsTotal, coutTotal };
  }
  return calculerTotauxLigne(ligne, tauxParType);
}

export interface TotauxGlobaux {
  nombreBesoins: number;
  totalDesign: number;
  totalFront: number;
  totalBack: number;
  totalConfig: number;
  totalJours: number;
  coutTotal: number;
}

export function calculerTotauxGlobaux(
  lignes: Ligne[],
  tauxParType: TauxParType
): TotauxGlobaux {
  const totaux = lignes.reduce(
    (acc, l) => {
      acc.totalDesign += l.tempsDesign;
      acc.totalFront += l.tempsFront;
      acc.totalBack += l.tempsBack;
      acc.totalConfig += l.tempsConfig;
      acc.coutTotal += calculerTotauxLigne(l, tauxParType).coutTotal;
      return acc;
    },
    { totalDesign: 0, totalFront: 0, totalBack: 0, totalConfig: 0, coutTotal: 0 }
  );
  const totalJours =
    totaux.totalDesign + totaux.totalFront + totaux.totalBack + totaux.totalConfig;

  return {
    nombreBesoins: lignes.length,
    ...totaux,
    totalJours,
  };
}

export interface BilanPhases {
  nombreBesoins: number;
  totalJours: number;
  coutTotal: number;
}

/**
 * Totaux tous phases confondues (utilisé par la Synthèse et la liste des
 * estimations) : passe chaque ligne par calculerTotauxLigneUnifie pour que
 * Conception générale (temps par profil direct) et les autres phases
 * (répartition UO) s'additionnent correctement dans le même total.
 */
export function calculerBilanPhases(
  lignes: Ligne[],
  tauxParType: TauxParType,
  tarifParCode: Map<string, number>
): BilanPhases {
  let totalJours = 0;
  let coutTotal = 0;
  for (const ligne of lignes) {
    const totaux = calculerTotauxLigneUnifie(ligne, tauxParType, tarifParCode);
    totalJours += totaux.tempsTotal;
    coutTotal += totaux.coutTotal;
  }
  return { nombreBesoins: lignes.length, totalJours, coutTotal };
}

export interface TotauxParGroupe {
  cle: string;
  nombreBesoins: number;
  totalJours: number;
  coutTotal: number;
}

export function calculerTotauxParGroupe(
  lignes: Ligne[],
  tauxParType: TauxParType,
  cleDeGroupe: (ligne: Ligne) => string
): TotauxParGroupe[] {
  const groupes = new Map<string, Ligne[]>();
  for (const ligne of lignes) {
    const cle = cleDeGroupe(ligne) || "(non renseigné)";
    const liste = groupes.get(cle) ?? [];
    liste.push(ligne);
    groupes.set(cle, liste);
  }

  return Array.from(groupes.entries())
    .map(([cle, lignesGroupe]) => {
      const totaux = calculerTotauxGlobaux(lignesGroupe, tauxParType);
      return {
        cle,
        nombreBesoins: totaux.nombreBesoins,
        totalJours: totaux.totalJours,
        coutTotal: totaux.coutTotal,
      };
    })
    .sort((a, b) => b.coutTotal - a.coutTotal);
}

function tempsPourType(ligne: Ligne, type: TypeUo): number {
  switch (type) {
    case "design":
      return ligne.tempsDesign;
    case "front":
      return ligne.tempsFront;
    case "back":
      return ligne.tempsBack;
    case "config":
      return ligne.tempsConfig;
  }
}

export interface TempsProfil {
  code: string;
  nom: string;
  temps: number;
  tarifJournalier: number;
  coutTotal: number;
}

/**
 * Ventile le temps de l'estimation par profil (Chef de projet, Développeur
 * Front…) en remontant, pour chaque élément UO, le code de profil qui lui
 * est associé (cf. GROUPES_UO). Le temps d'un élément = Σ, pour chaque type
 * (Design/Front/Back/Config), temps du type × son % dans la répartition UO
 * de cette estimation. Plusieurs éléments peuvent partager un même profil
 * (ex. Chef de projet pilote à la fois "Gestion de projet" et "Assistance à
 * la recette client") : leurs temps s'additionnent.
 */
export function calculerTempsParProfil(
  lignes: Ligne[],
  uo: ElementUo[],
  tarifs: TarifUo[]
): TempsProfil[] {
  const tarifParCode = construireTarifParCode(tarifs);
  const codeParCle = new Map<string, string>();
  for (const groupe of GROUPES_UO) {
    for (const element of groupe.elements) {
      codeParCle.set(element.cle, element.code);
    }
  }

  const totalTempsParType = new Map<TypeUo, number>();
  for (const type of TYPES_UO) {
    totalTempsParType.set(
      type.cle,
      lignes.reduce((acc, l) => acc + tempsPourType(l, type.cle), 0)
    );
  }

  const tempsParCode = new Map<string, number>();
  for (const u of uo) {
    if (u.pourcentage <= 0) continue;
    const code = codeParCle.get(u.cle);
    if (!code) continue;
    const tempsType = totalTempsParType.get(u.type) ?? 0;
    const temps = tempsType * (u.pourcentage / 100);
    tempsParCode.set(code, (tempsParCode.get(code) ?? 0) + temps);
  }

  // Conception générale : temps par profil saisi directement, sans passer
  // par la répartition UO — s'ajoute à ce qui vient des autres phases.
  for (const ligne of lignes) {
    if (ligne.phase !== "conceptionGenerale") continue;
    for (const profil of PROFILS_CONCEPTION_GENERALE) {
      const temps = ligne[profil.champ];
      if (temps) tempsParCode.set(profil.code, (tempsParCode.get(profil.code) ?? 0) + temps);
    }
  }

  return PROFILS_UO.map((profil) => {
    const temps = tempsParCode.get(profil.code) ?? 0;
    const tarifJournalier = tarifParCode.get(profil.code) ?? 0;
    return {
      code: profil.code,
      nom: profil.nom,
      temps,
      tarifJournalier,
      coutTotal: temps * tarifJournalier,
    };
  });
}

/**
 * TJM moyen du projet : moyenne des temps par profil (onglet Analyse)
 * pondérée par le TJM de chaque profil — Σ(temps × TJM) / Σ(temps). Si rien
 * n'est encore chiffré, retombe sur le taux journalier de l'estimation.
 */
export function calculerTjmMoyenProjet(
  tempsParProfil: TempsProfil[],
  tauxJournalierParDefaut: number
): number {
  const totalTemps = tempsParProfil.reduce((acc, p) => acc + p.temps, 0);
  if (totalTemps <= 0) return tauxJournalierParDefaut;
  const totalCout = tempsParProfil.reduce((acc, p) => acc + p.coutTotal, 0);
  return totalCout / totalTemps;
}

export function formaterJours(valeur: number): string {
  return `${round(valeur)} j`;
}

// Un total qui mélange les 4 types de temps (Design/Front/Back/Config) n'est
// plus un simple compte de jours homogène : chaque type a son propre taux UO.
// On l'affiche donc en "UO" plutôt qu'en "j", réservé aux totaux mono-type.
export function formaterUo(valeur: number): string {
  return `${round(valeur)} UO`;
}

export function formaterEuros(valeur: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(valeur);
}

function round(valeur: number): number {
  return Math.round(valeur * 100) / 100;
}
