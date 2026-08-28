import { describe, expect, it } from "vitest";
import type { ElementUo, Ligne, TarifUo } from "@/types";
import {
  calculerTauxParType,
  calculerTotauxGlobaux,
  calculerTotauxLigne,
  calculerTotauxLigneUnifie,
  calculerTotauxParGroupe,
  calculerTjmMoyenProjet,
} from "@/lib/calculations";

function ligneFactice(overrides: Partial<Ligne> = {}): Ligne {
  return {
    id: "l1",
    estimationId: "e1",
    ordre: 0,
    phase: "realisation",
    besoinClient: "",
    solutionProposee: "",
    categorie: "",
    version: "",
    tempsDesign: 0,
    tempsFront: 0,
    tempsBack: 0,
    tempsConfig: 0,
    tempsTechExpert: 0,
    tempsConsultant: 0,
    tempsDesigner: 0,
    tempsChefDeProjet: 0,
    tempsRespDeProjets: 0,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("calculerTauxParType", () => {
  it("retombe sur le taux journalier par défaut quand aucune répartition n'est configurée", () => {
    const taux = calculerTauxParType([], [], 550);
    expect(taux).toEqual({ design: 550, front: 550, back: 550, config: 550 });
  });

  it("calcule un taux composite à partir de la répartition en %", () => {
    const uo: ElementUo[] = [
      { cle: "developpementFront", type: "front", pourcentage: 100 },
    ];
    const tarifs: TarifUo[] = [{ cle: "developpementFront", tarifJournalier: 750 }];
    const taux = calculerTauxParType(uo, tarifs, 550);
    expect(taux.front).toBe(750);
    // Les autres types, sans répartition configurée, retombent sur le taux par défaut.
    expect(taux.design).toBe(550);
  });
});

describe("calculerTotauxLigne", () => {
  it("additionne temps et coût des 4 natures de charge", () => {
    const ligne = ligneFactice({ tempsDesign: 1, tempsFront: 2, tempsBack: 3, tempsConfig: 4 });
    const totaux = calculerTotauxLigne(ligne, { design: 100, front: 200, back: 300, config: 400 });
    expect(totaux.tempsTotal).toBe(10);
    expect(totaux.coutTotal).toBe(1 * 100 + 2 * 200 + 3 * 300 + 4 * 400);
  });
});

describe("calculerTotauxLigneUnifie", () => {
  it("bascule sur le temps par profil pour la phase Conception générale", () => {
    const ligne = ligneFactice({
      phase: "conceptionGenerale",
      tempsTechExpert: 2,
      tempsChefDeProjet: 1,
      // Ces champs ne doivent pas être pris en compte pour cette phase.
      tempsDesign: 99,
    });
    const tarifParCode = new Map([
      ["TE", 900],
      ["CLT", 900],
      ["UXUI", 650],
      ["CP", 750],
      ["RP", 850],
    ]);
    const totaux = calculerTotauxLigneUnifie(
      ligne,
      { design: 0, front: 0, back: 0, config: 0 },
      tarifParCode
    );
    expect(totaux.tempsTotal).toBe(3);
    expect(totaux.coutTotal).toBe(2 * 900 + 1 * 750);
  });
});

describe("calculerTotauxParGroupe", () => {
  it("regroupe les lignes sans catégorie sous « (non renseigné) »", () => {
    const lignes = [
      ligneFactice({ id: "l1", categorie: "", tempsFront: 1 }),
      ligneFactice({ id: "l2", categorie: "Catalogue", tempsFront: 1 }),
    ];
    const groupes = calculerTotauxParGroupe(
      lignes,
      { design: 100, front: 100, back: 100, config: 100 },
      (l) => l.categorie
    );
    const cles = groupes.map((g) => g.cle);
    expect(cles).toContain("(non renseigné)");
    expect(cles).toContain("Catalogue");
  });
});

describe("calculerTotauxGlobaux", () => {
  it("totalise plusieurs lignes", () => {
    const lignes = [
      ligneFactice({ id: "l1", tempsFront: 2 }),
      ligneFactice({ id: "l2", tempsBack: 3 }),
    ];
    const totaux = calculerTotauxGlobaux(lignes, { design: 0, front: 100, back: 100, config: 0 });
    expect(totaux.nombreBesoins).toBe(2);
    expect(totaux.totalJours).toBe(5);
    expect(totaux.coutTotal).toBe(2 * 100 + 3 * 100);
  });
});

describe("calculerTjmMoyenProjet", () => {
  it("retombe sur le taux par défaut si rien n'est chiffré", () => {
    expect(calculerTjmMoyenProjet([], 550)).toBe(550);
  });

  it("calcule une moyenne pondérée par le temps de chaque profil", () => {
    const tjm = calculerTjmMoyenProjet(
      [
        { code: "A", nom: "A", temps: 2, tarifJournalier: 100, coutTotal: 200 },
        { code: "B", nom: "B", temps: 8, tarifJournalier: 500, coutTotal: 4000 },
      ],
      550
    );
    expect(tjm).toBe((200 + 4000) / (2 + 8));
  });
});
