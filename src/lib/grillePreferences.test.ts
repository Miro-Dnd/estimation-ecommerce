import { describe, expect, it } from "vitest";
import {
  avecColonneMasquee,
  avecHauteurLigne,
  avecLargeurColonne,
  avecToutesLesColonnesVisibles,
  chargerPreferences,
  clamp,
  colonneVisible,
  hauteurLigne,
  largeurColonne,
  preferencesParDefaut,
  sansDimensionsPersonnalisees,
  sansHauteurLigne,
  sansLargeurColonne,
  sauvegarderPreferences,
} from "@/lib/grillePreferences";

describe("clamp", () => {
  it("laisse passer une valeur dans les bornes", () => {
    expect(clamp(50, 10, 100)).toBe(50);
  });
  it("remonte une valeur trop petite au minimum", () => {
    expect(clamp(-5, 10, 100)).toBe(10);
  });
  it("redescend une valeur trop grande au maximum", () => {
    expect(clamp(500, 10, 100)).toBe(100);
  });
  it("retombe sur le minimum pour une valeur non finie", () => {
    expect(clamp(NaN, 10, 100)).toBe(10);
  });
});

describe("largeurColonne", () => {
  it("retourne la largeur par défaut si rien n'est personnalisé", () => {
    const prefs = preferencesParDefaut();
    expect(largeurColonne(prefs, "besoinClient")).toBe(220);
  });

  it("retourne la largeur personnalisée si elle est dans les bornes", () => {
    const prefs = avecLargeurColonne(preferencesParDefaut(), "categorie", 200);
    expect(largeurColonne(prefs, "categorie")).toBe(200);
  });

  it("écrête à l'enregistrement une largeur hors bornes (colonne 'categorie' : 100-320)", () => {
    const prefs = avecLargeurColonne(preferencesParDefaut(), "categorie", 5000);
    expect(largeurColonne(prefs, "categorie")).toBe(320);
  });
});

describe("sansLargeurColonne", () => {
  it("revient à la largeur par défaut après réinitialisation d'une colonne", () => {
    const prefs = avecLargeurColonne(preferencesParDefaut(), "categorie", 200);
    const reinitialisees = sansLargeurColonne(prefs, "categorie");
    expect(largeurColonne(reinitialisees, "categorie")).toBe(140);
  });

  it("ne touche pas aux autres colonnes personnalisées", () => {
    let prefs = avecLargeurColonne(preferencesParDefaut(), "categorie", 200);
    prefs = avecLargeurColonne(prefs, "version", 250);
    const reinitialisees = sansLargeurColonne(prefs, "categorie");
    expect(largeurColonne(reinitialisees, "version")).toBe(250);
  });
});

describe("hauteurLigne / avecHauteurLigne / sansHauteurLigne", () => {
  it("retourne la hauteur par défaut pour une ligne inconnue", () => {
    expect(hauteurLigne(preferencesParDefaut(), "ligne-1")).toBe(56);
  });

  it("écrête au minimum (40) une hauteur trop petite", () => {
    const prefs = avecHauteurLigne(preferencesParDefaut(), "ligne-1", 5);
    expect(hauteurLigne(prefs, "ligne-1")).toBe(40);
  });

  it("écrête au maximum (400) une hauteur trop grande", () => {
    const prefs = avecHauteurLigne(preferencesParDefaut(), "ligne-1", 10000);
    expect(hauteurLigne(prefs, "ligne-1")).toBe(400);
  });

  it("revient à la hauteur par défaut après réinitialisation", () => {
    const prefs = avecHauteurLigne(preferencesParDefaut(), "ligne-1", 200);
    expect(hauteurLigne(sansHauteurLigne(prefs, "ligne-1"), "ligne-1")).toBe(56);
  });
});

describe("colonneVisible / avecColonneMasquee", () => {
  it("toutes les colonnes sont visibles par défaut", () => {
    const prefs = preferencesParDefaut();
    expect(colonneVisible(prefs, "categorie")).toBe(true);
  });

  it("masque une colonne masquable", () => {
    const prefs = avecColonneMasquee(preferencesParDefaut(), "categorie", true);
    expect(colonneVisible(prefs, "categorie")).toBe(false);
  });

  it("réaffiche une colonne masquée", () => {
    let prefs = avecColonneMasquee(preferencesParDefaut(), "categorie", true);
    prefs = avecColonneMasquee(prefs, "categorie", false);
    expect(colonneVisible(prefs, "categorie")).toBe(true);
  });

  it("refuse de masquer la colonne 'besoinClient' (non masquable)", () => {
    const prefs = avecColonneMasquee(preferencesParDefaut(), "besoinClient", true);
    expect(colonneVisible(prefs, "besoinClient")).toBe(true);
  });
});

describe("avecToutesLesColonnesVisibles", () => {
  it("réaffiche toutes les colonnes masquées en une fois", () => {
    let prefs = avecColonneMasquee(preferencesParDefaut(), "categorie", true);
    prefs = avecColonneMasquee(prefs, "version", true);
    const reinitialisees = avecToutesLesColonnesVisibles(prefs);
    expect(colonneVisible(reinitialisees, "categorie")).toBe(true);
    expect(colonneVisible(reinitialisees, "version")).toBe(true);
  });
});

describe("sansDimensionsPersonnalisees", () => {
  it("réinitialise largeurs et hauteurs mais pas la visibilité des colonnes", () => {
    let prefs = avecLargeurColonne(preferencesParDefaut(), "categorie", 200);
    prefs = avecHauteurLigne(prefs, "ligne-1", 200);
    prefs = avecColonneMasquee(prefs, "version", true);

    const reinitialisees = sansDimensionsPersonnalisees(prefs);

    expect(largeurColonne(reinitialisees, "categorie")).toBe(140);
    expect(hauteurLigne(reinitialisees, "ligne-1")).toBe(56);
    // La visibilité n'est pas concernée par ce reset — action distincte.
    expect(colonneVisible(reinitialisees, "version")).toBe(false);
  });
});

describe("chargerPreferences / sauvegarderPreferences en environnement sans window (SSR)", () => {
  it("chargerPreferences retombe sur les valeurs par défaut sans lever d'erreur", () => {
    expect(chargerPreferences()).toEqual(preferencesParDefaut());
  });

  it("sauvegarderPreferences ne lève pas d'erreur", () => {
    expect(() => sauvegarderPreferences(preferencesParDefaut())).not.toThrow();
  });
});
