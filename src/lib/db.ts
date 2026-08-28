import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import type {
  CmsTechnologie,
  ElementUo,
  Estimation,
  EstimationInput,
  EstimationSummary,
  EstimationWithLignes,
  Ligne,
  LigneCreateInput,
  LigneInput,
  TarifUo,
} from "@/types";
import {
  BLOCS_CONCEPTION_GENERALE,
  CMS_SUGGERES,
  GROUPES_UO,
  PHASE_DEFAUT,
  PROFILS_CONCEPTION_GENERALE,
  TAUX_JOURNALIER_DEFAUT,
  TYPES_UO,
} from "@/lib/constants";
import {
  calculerTauxParType,
  calculerTotauxLigneUnifie,
  construireTarifParCode,
} from "@/lib/calculations";

// ---------------------------------------------------------------------------
// Connexion : un seul fichier SQLite, créé automatiquement au démarrage.
// On utilise une variable globale pour éviter de ré-ouvrir la base à chaque
// hot-reload en développement (comportement recommandé par Next.js).
// ---------------------------------------------------------------------------

declare global {
  var __estimationDb: Database.Database | undefined;
}

function ouvrirBase(): Database.Database {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, "estimations.db");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initialiserSchema(db);
  return db;
}

function initialiserSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS estimations (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL,
      client TEXT,
      description TEXT,
      cms TEXT,
      tauxJournalier REAL NOT NULL DEFAULT ${TAUX_JOURNALIER_DEFAUT},
      statut TEXT NOT NULL DEFAULT 'brouillon',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lignes (
      id TEXT PRIMARY KEY,
      estimationId TEXT NOT NULL REFERENCES estimations(id) ON DELETE CASCADE,
      ordre INTEGER NOT NULL,
      phase TEXT NOT NULL DEFAULT '${PHASE_DEFAUT}',
      besoinClient TEXT NOT NULL DEFAULT '',
      solutionProposee TEXT NOT NULL DEFAULT '',
      categorie TEXT NOT NULL DEFAULT '',
      version TEXT NOT NULL DEFAULT '',
      tempsDesign REAL NOT NULL DEFAULT 0,
      tempsFront REAL NOT NULL DEFAULT 0,
      tempsBack REAL NOT NULL DEFAULT 0,
      tempsConfig REAL NOT NULL DEFAULT 0,
      tempsTechExpert REAL NOT NULL DEFAULT 0,
      tempsConsultant REAL NOT NULL DEFAULT 0,
      tempsDesigner REAL NOT NULL DEFAULT 0,
      tempsChefDeProjet REAL NOT NULL DEFAULT 0,
      tempsRespDeProjets REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_lignes_estimation ON lignes(estimationId);

    CREATE TABLE IF NOT EXISTS parametres_uo (
      cle TEXT NOT NULL,
      type TEXT NOT NULL,
      pourcentage REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (cle, type)
    );

    CREATE TABLE IF NOT EXISTS estimation_uo (
      estimationId TEXT NOT NULL REFERENCES estimations(id) ON DELETE CASCADE,
      cle TEXT NOT NULL,
      type TEXT NOT NULL,
      pourcentage REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (estimationId, cle, type)
    );

    CREATE INDEX IF NOT EXISTS idx_estimation_uo_estimation ON estimation_uo(estimationId);

    CREATE TABLE IF NOT EXISTS tarifs_uo (
      cle TEXT PRIMARY KEY,
      tarifJournalier REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS estimation_tarifs (
      estimationId TEXT NOT NULL REFERENCES estimations(id) ON DELETE CASCADE,
      cle TEXT NOT NULL,
      tarifJournalier REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (estimationId, cle)
    );

    CREATE INDEX IF NOT EXISTS idx_estimation_tarifs_estimation ON estimation_tarifs(estimationId);

    CREATE TABLE IF NOT EXISTS cms_technologies (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL UNIQUE,
      actif INTEGER NOT NULL DEFAULT 1,
      ordre INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Migration : ajoute la colonne cms aux bases créées avant son introduction.
  const colonnes = db.prepare(`PRAGMA table_info(estimations)`).all() as {
    name: string;
  }[];
  if (!colonnes.some((c) => c.name === "cms")) {
    db.exec(`ALTER TABLE estimations ADD COLUMN cms TEXT`);
  }

  // Migration : ajoute la colonne phase aux lignes créées avant l'ajout des
  // onglets par phase — elles basculent toutes en "Réalisation", qui reprend
  // le rôle de l'ancien onglet "Détail" unique.
  const colonnesLignes = db.prepare(`PRAGMA table_info(lignes)`).all() as {
    name: string;
  }[];
  if (!colonnesLignes.some((c) => c.name === "phase")) {
    db.exec(
      `ALTER TABLE lignes ADD COLUMN phase TEXT NOT NULL DEFAULT '${PHASE_DEFAUT}'`
    );
  }

  // Migration : ajoute les colonnes de temps par profil (Conception
  // générale) aux lignes créées avant leur introduction.
  for (const profil of PROFILS_CONCEPTION_GENERALE) {
    if (!colonnesLignes.some((c) => c.name === profil.champ)) {
      db.exec(`ALTER TABLE lignes ADD COLUMN ${profil.champ} REAL NOT NULL DEFAULT 0`);
    }
  }

  // Migration : les blocs de Conception générale étaient d'abord libellés
  // "Bloc N - Titre" ; on les ramène au titre seul, qui est désormais le nom
  // de catégorie attendu pour rattacher une ligne à son bloc.
  const renommerBloc = db.prepare(
    `UPDATE lignes SET categorie = ? WHERE phase = 'conceptionGenerale' AND categorie = ?`
  );
  BLOCS_CONCEPTION_GENERALE.forEach((titre, index) => {
    renommerBloc.run(titre, `Bloc ${index + 1} - ${titre}`);
  });

  // Migration : la première version de parametres_uo n'avait qu'une seule
  // valeur par élément (pas de distinction par type de temps). On repart
  // d'une table vide plutôt que de deviner comment répartir l'ancienne
  // valeur unique sur les 4 types.
  const colonnesUo = db.prepare(`PRAGMA table_info(parametres_uo)`).all() as {
    name: string;
  }[];
  if (colonnesUo.length > 0 && !colonnesUo.some((c) => c.name === "type")) {
    db.exec(`DROP TABLE parametres_uo`);
    db.exec(`
      CREATE TABLE parametres_uo (
        cle TEXT NOT NULL,
        type TEXT NOT NULL,
        pourcentage REAL NOT NULL DEFAULT 0,
        PRIMARY KEY (cle, type)
      );
    `);
  }

  // Amorce une ligne par élément UO connu, pour chaque type de temps
  // (paramétrage global, partagé par toutes les estimations) sans écraser un
  // pourcentage déjà saisi.
  const insertSiAbsent = db.prepare(
    `INSERT OR IGNORE INTO parametres_uo (cle, type, pourcentage) VALUES (?, ?, 0)`
  );
  for (const groupe of GROUPES_UO) {
    for (const element of groupe.elements) {
      for (const type of TYPES_UO) {
        insertSiAbsent.run(element.cle, type.cle);
      }
    }
  }

  // Amorce le tarif journalier par défaut de chaque élément (grille de
  // référence) sans écraser un tarif déjà personnalisé.
  const insertTarifSiAbsent = db.prepare(
    `INSERT OR IGNORE INTO tarifs_uo (cle, tarifJournalier) VALUES (?, ?)`
  );
  for (const groupe of GROUPES_UO) {
    for (const element of groupe.elements) {
      insertTarifSiAbsent.run(element.cle, element.tarifDefaut);
    }
  }

  // Migration : les estimations créées avant l'introduction des UO par
  // estimation n'ont aucune ligne dans estimation_uo. On les amorce avec les
  // paramètres globaux courants, comme si elles venaient d'être créées —
  // elles pourront ensuite diverger indépendamment, comme les autres.
  const estimationsSansUo = db
    .prepare(
      `SELECT id FROM estimations WHERE id NOT IN (SELECT DISTINCT estimationId FROM estimation_uo)`
    )
    .all() as { id: string }[];
  if (estimationsSansUo.length > 0) {
    const parametresActuels = db
      .prepare(`SELECT cle, type, pourcentage FROM parametres_uo`)
      .all() as ElementUo[];
    const transaction = db.transaction(() => {
      for (const { id } of estimationsSansUo) {
        copierParametresUoVersEstimation(db, id, parametresActuels);
      }
    });
    transaction();
  }

  // Amorce la liste administrable des CMS/technologies avec les suggestions
  // qui étaient jusqu'ici codées en dur, sans écraser une liste déjà
  // personnalisée (table non vide = déjà amorcée ou déjà gérée).
  const nombreCmsTechnologies = db
    .prepare(`SELECT COUNT(*) AS n FROM cms_technologies`)
    .get() as { n: number };
  if (nombreCmsTechnologies.n === 0) {
    const insertCms = db.prepare(
      `INSERT INTO cms_technologies (id, nom, actif, ordre) VALUES (?, ?, 1, ?)`
    );
    CMS_SUGGERES.forEach((nom, index) => insertCms.run(randomUUID(), nom, index));
  }

  // Migration : même principe pour les tarifs par estimation, introduits
  // après les % — on amorce les estimations existantes avec la grille
  // globale courante.
  const estimationsSansTarifs = db
    .prepare(
      `SELECT id FROM estimations WHERE id NOT IN (SELECT DISTINCT estimationId FROM estimation_tarifs)`
    )
    .all() as { id: string }[];
  if (estimationsSansTarifs.length > 0) {
    const tarifsActuels = db
      .prepare(`SELECT cle, tarifJournalier FROM tarifs_uo`)
      .all() as TarifUo[];
    const transaction = db.transaction(() => {
      for (const { id } of estimationsSansTarifs) {
        copierTarifsVersEstimation(db, id, tarifsActuels);
      }
    });
    transaction();
  }
}

function getDb(): Database.Database {
  if (!global.__estimationDb) {
    global.__estimationDb = ouvrirBase();
  }
  return global.__estimationDb;
}

function maintenant(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Estimations
// ---------------------------------------------------------------------------

export function listerEstimations(): EstimationSummary[] {
  const db = getDb();
  const estimations = db
    .prepare(`SELECT * FROM estimations ORDER BY updatedAt DESC`)
    .all() as Estimation[];

  const lignesParEstimation = db
    .prepare(`SELECT * FROM lignes`)
    .all() as (Ligne & { estimationId: string })[];
  const uoParEstimation = db
    .prepare(`SELECT estimationId, cle, type, pourcentage FROM estimation_uo`)
    .all() as (ElementUo & { estimationId: string })[];
  const tarifsParEstimation = db
    .prepare(`SELECT estimationId, cle, tarifJournalier FROM estimation_tarifs`)
    .all() as (TarifUo & { estimationId: string })[];

  return estimations.map((e) => {
    const lignes = lignesParEstimation.filter((l) => l.estimationId === e.id);
    const uo = uoParEstimation.filter((u) => u.estimationId === e.id);
    const tarifs = tarifsParEstimation.filter((t) => t.estimationId === e.id);
    const tauxParType = calculerTauxParType(uo, tarifs, e.tauxJournalier);
    const tarifParCode = construireTarifParCode(tarifs);
    let tempsTotal = 0;
    let coutTotal = 0;
    for (const l of lignes) {
      const totaux = calculerTotauxLigneUnifie(l, tauxParType, tarifParCode);
      tempsTotal += totaux.tempsTotal;
      coutTotal += totaux.coutTotal;
    }
    return {
      ...e,
      nombreLignes: lignes.length,
      tempsTotal,
      coutTotal,
    };
  });
}

export function creerEstimation(input: EstimationInput): Estimation {
  const db = getDb();
  const now = maintenant();
  const estimation: Estimation = {
    id: randomUUID(),
    nom: input.nom?.trim() || "Nouvelle estimation",
    client: input.client ?? null,
    description: input.description ?? null,
    cms: input.cms ?? null,
    tauxJournalier: input.tauxJournalier ?? TAUX_JOURNALIER_DEFAUT,
    statut: input.statut ?? "brouillon",
    createdAt: now,
    updatedAt: now,
  };

  const insertEstimation = db.prepare(
    `INSERT INTO estimations (id, nom, client, description, cms, tauxJournalier, statut, createdAt, updatedAt)
     VALUES (@id, @nom, @client, @description, @cms, @tauxJournalier, @statut, @createdAt, @updatedAt)`
  );

  const transaction = db.transaction(() => {
    insertEstimation.run(estimation);
    // Les % UO et tarifs courants (paramètres globaux) deviennent les
    // valeurs par défaut de cette estimation, éditables indépendamment par
    // la suite, sans impact sur les autres estimations.
    copierParametresUoVersEstimation(db, estimation.id, listerParametresUo());
    copierTarifsVersEstimation(db, estimation.id, listerTarifsUo());
  });
  transaction();

  return estimation;
}

export function obtenirEstimation(id: string): EstimationWithLignes | null {
  const db = getDb();
  const estimation = db
    .prepare(`SELECT * FROM estimations WHERE id = ?`)
    .get(id) as Estimation | undefined;
  if (!estimation) return null;
  const lignes = db
    .prepare(`SELECT * FROM lignes WHERE estimationId = ? ORDER BY ordre ASC`)
    .all(id) as Ligne[];
  const uo = db
    .prepare(`SELECT cle, type, pourcentage FROM estimation_uo WHERE estimationId = ?`)
    .all(id) as ElementUo[];
  const tarifs = db
    .prepare(`SELECT cle, tarifJournalier FROM estimation_tarifs WHERE estimationId = ?`)
    .all(id) as TarifUo[];
  return { ...estimation, lignes, uo, tarifs };
}

export function modifierEstimation(
  id: string,
  input: EstimationInput
): Estimation | null {
  const db = getDb();
  const existante = db
    .prepare(`SELECT * FROM estimations WHERE id = ?`)
    .get(id) as Estimation | undefined;
  if (!existante) return null;

  const maj: Estimation = {
    ...existante,
    ...input,
    id: existante.id,
    updatedAt: maintenant(),
  };
  db.prepare(
    `UPDATE estimations SET nom=@nom, client=@client, description=@description, cms=@cms,
     tauxJournalier=@tauxJournalier, statut=@statut, updatedAt=@updatedAt WHERE id=@id`
  ).run(maj);
  return maj;
}

export function supprimerEstimation(id: string): boolean {
  const db = getDb();
  const res = db.prepare(`DELETE FROM estimations WHERE id = ?`).run(id);
  return res.changes > 0;
}

export function dupliquerEstimation(id: string): EstimationWithLignes | null {
  const db = getDb();
  const source = obtenirEstimation(id);
  if (!source) return null;

  const now = maintenant();
  const nouvelleEstimation: Estimation = {
    id: randomUUID(),
    nom: `${source.nom} (copie)`,
    client: source.client,
    description: source.description,
    cms: source.cms,
    tauxJournalier: source.tauxJournalier,
    statut: "brouillon",
    createdAt: now,
    updatedAt: now,
  };

  const insertEstimation = db.prepare(
    `INSERT INTO estimations (id, nom, client, description, cms, tauxJournalier, statut, createdAt, updatedAt)
     VALUES (@id, @nom, @client, @description, @cms, @tauxJournalier, @statut, @createdAt, @updatedAt)`
  );
  const insertLigne = db.prepare(
    `INSERT INTO lignes (id, estimationId, ordre, phase, besoinClient, solutionProposee, categorie, version,
       tempsDesign, tempsFront, tempsBack, tempsConfig,
       tempsTechExpert, tempsConsultant, tempsDesigner, tempsChefDeProjet, tempsRespDeProjets,
       createdAt, updatedAt)
     VALUES (@id, @estimationId, @ordre, @phase, @besoinClient, @solutionProposee, @categorie, @version,
       @tempsDesign, @tempsFront, @tempsBack, @tempsConfig,
       @tempsTechExpert, @tempsConsultant, @tempsDesigner, @tempsChefDeProjet, @tempsRespDeProjets,
       @createdAt, @updatedAt)`
  );

  const transaction = db.transaction(() => {
    insertEstimation.run(nouvelleEstimation);
    for (const ligne of source.lignes) {
      insertLigne.run({
        ...ligne,
        id: randomUUID(),
        estimationId: nouvelleEstimation.id,
        createdAt: now,
        updatedAt: now,
      });
    }
    // On reprend la répartition UO et les tarifs propres à la source, pas
    // les paramètres globaux courants : une copie doit préserver l'état de
    // l'original.
    copierParametresUoVersEstimation(db, nouvelleEstimation.id, source.uo);
    copierTarifsVersEstimation(db, nouvelleEstimation.id, source.tarifs);
  });
  transaction();

  return obtenirEstimation(nouvelleEstimation.id);
}

// ---------------------------------------------------------------------------
// Lignes
// ---------------------------------------------------------------------------

export function creerLigne(estimationId: string, input: LigneCreateInput): Ligne {
  const db = getDb();
  const now = maintenant();
  const maxOrdre = db
    .prepare(
      `SELECT COALESCE(MAX(ordre), -1) AS maxOrdre FROM lignes WHERE estimationId = ?`
    )
    .get(estimationId) as { maxOrdre: number };

  const ligne: Ligne = {
    id: randomUUID(),
    estimationId,
    ordre: maxOrdre.maxOrdre + 1,
    phase: input.phase ?? PHASE_DEFAUT,
    besoinClient: input.besoinClient ?? "",
    solutionProposee: input.solutionProposee ?? "",
    categorie: input.categorie ?? "",
    version: input.version ?? "",
    tempsDesign: input.tempsDesign ?? 0,
    tempsFront: input.tempsFront ?? 0,
    tempsBack: input.tempsBack ?? 0,
    tempsConfig: input.tempsConfig ?? 0,
    tempsTechExpert: input.tempsTechExpert ?? 0,
    tempsConsultant: input.tempsConsultant ?? 0,
    tempsDesigner: input.tempsDesigner ?? 0,
    tempsChefDeProjet: input.tempsChefDeProjet ?? 0,
    tempsRespDeProjets: input.tempsRespDeProjets ?? 0,
    createdAt: now,
    updatedAt: now,
  };

  db.prepare(
    `INSERT INTO lignes (id, estimationId, ordre, phase, besoinClient, solutionProposee, categorie, version,
       tempsDesign, tempsFront, tempsBack, tempsConfig,
       tempsTechExpert, tempsConsultant, tempsDesigner, tempsChefDeProjet, tempsRespDeProjets,
       createdAt, updatedAt)
     VALUES (@id, @estimationId, @ordre, @phase, @besoinClient, @solutionProposee, @categorie, @version,
       @tempsDesign, @tempsFront, @tempsBack, @tempsConfig,
       @tempsTechExpert, @tempsConsultant, @tempsDesigner, @tempsChefDeProjet, @tempsRespDeProjets,
       @createdAt, @updatedAt)`
  ).run(ligne);

  toucherEstimation(estimationId);
  return ligne;
}

export function modifierLigne(
  estimationId: string,
  ligneId: string,
  input: LigneInput
): Ligne | null {
  const db = getDb();
  const existante = db
    .prepare(`SELECT * FROM lignes WHERE id = ? AND estimationId = ?`)
    .get(ligneId, estimationId) as Ligne | undefined;
  if (!existante) return null;

  const maj: Ligne = {
    ...existante,
    ...input,
    id: existante.id,
    estimationId: existante.estimationId,
    ordre: existante.ordre,
    updatedAt: maintenant(),
  };

  db.prepare(
    `UPDATE lignes SET besoinClient=@besoinClient, solutionProposee=@solutionProposee,
     categorie=@categorie, version=@version, tempsDesign=@tempsDesign, tempsFront=@tempsFront,
     tempsBack=@tempsBack, tempsConfig=@tempsConfig,
     tempsTechExpert=@tempsTechExpert, tempsConsultant=@tempsConsultant, tempsDesigner=@tempsDesigner,
     tempsChefDeProjet=@tempsChefDeProjet, tempsRespDeProjets=@tempsRespDeProjets,
     updatedAt=@updatedAt
     WHERE id=@id AND estimationId=@estimationId`
  ).run(maj);

  toucherEstimation(estimationId);
  return maj;
}

export function supprimerLigne(estimationId: string, ligneId: string): boolean {
  const db = getDb();
  const res = db
    .prepare(`DELETE FROM lignes WHERE id = ? AND estimationId = ?`)
    .run(ligneId, estimationId);
  if (res.changes > 0) toucherEstimation(estimationId);
  return res.changes > 0;
}

export function dupliquerLigne(estimationId: string, ligneId: string): Ligne | null {
  const db = getDb();
  const source = db
    .prepare(`SELECT * FROM lignes WHERE id = ? AND estimationId = ?`)
    .get(ligneId, estimationId) as Ligne | undefined;
  if (!source) return null;

  // Décale l'ordre de toutes les lignes suivantes pour insérer juste après la source.
  db.prepare(
    `UPDATE lignes SET ordre = ordre + 1 WHERE estimationId = ? AND ordre > ?`
  ).run(estimationId, source.ordre);

  const now = maintenant();
  const copie: Ligne = {
    ...source,
    id: randomUUID(),
    ordre: source.ordre + 1,
    createdAt: now,
    updatedAt: now,
  };
  db.prepare(
    `INSERT INTO lignes (id, estimationId, ordre, phase, besoinClient, solutionProposee, categorie, version,
       tempsDesign, tempsFront, tempsBack, tempsConfig,
       tempsTechExpert, tempsConsultant, tempsDesigner, tempsChefDeProjet, tempsRespDeProjets,
       createdAt, updatedAt)
     VALUES (@id, @estimationId, @ordre, @phase, @besoinClient, @solutionProposee, @categorie, @version,
       @tempsDesign, @tempsFront, @tempsBack, @tempsConfig,
       @tempsTechExpert, @tempsConsultant, @tempsDesigner, @tempsChefDeProjet, @tempsRespDeProjets,
       @createdAt, @updatedAt)`
  ).run(copie);

  toucherEstimation(estimationId);
  return copie;
}

export function reordonnerLignes(estimationId: string, ordreIds: string[]): void {
  const db = getDb();
  const update = db.prepare(
    `UPDATE lignes SET ordre = ? WHERE id = ? AND estimationId = ?`
  );
  const transaction = db.transaction(() => {
    ordreIds.forEach((id, index) => {
      update.run(index, id, estimationId);
    });
  });
  transaction();
  toucherEstimation(estimationId);
}

function toucherEstimation(estimationId: string): void {
  const db = getDb();
  db.prepare(`UPDATE estimations SET updatedAt = ? WHERE id = ?`).run(
    maintenant(),
    estimationId
  );
}

// ---------------------------------------------------------------------------
// Paramètres UO (unités d'œuvre) — réglage global, partagé par toutes les
// estimations.
// ---------------------------------------------------------------------------

export function listerParametresUo(): ElementUo[] {
  const db = getDb();
  return db
    .prepare(`SELECT cle, type, pourcentage FROM parametres_uo`)
    .all() as ElementUo[];
}

export function modifierParametreUo(
  cle: string,
  type: string,
  pourcentage: number
): void {
  const db = getDb();
  db.prepare(
    `UPDATE parametres_uo SET pourcentage = ? WHERE cle = ? AND type = ?`
  ).run(pourcentage, cle, type);
}

export function listerTarifsUo(): TarifUo[] {
  const db = getDb();
  return db.prepare(`SELECT cle, tarifJournalier FROM tarifs_uo`).all() as TarifUo[];
}

export function modifierTarifUo(cle: string, tarifJournalier: number): void {
  const db = getDb();
  db.prepare(`UPDATE tarifs_uo SET tarifJournalier = ? WHERE cle = ?`).run(
    tarifJournalier,
    cle
  );
}

function copierParametresUoVersEstimation(
  db: Database.Database,
  estimationId: string,
  elements: ElementUo[]
): void {
  const insert = db.prepare(
    `INSERT INTO estimation_uo (estimationId, cle, type, pourcentage) VALUES (?, ?, ?, ?)`
  );
  for (const e of elements) {
    insert.run(estimationId, e.cle, e.type, e.pourcentage);
  }
}

function copierTarifsVersEstimation(
  db: Database.Database,
  estimationId: string,
  tarifs: TarifUo[]
): void {
  const insert = db.prepare(
    `INSERT INTO estimation_tarifs (estimationId, cle, tarifJournalier) VALUES (?, ?, ?)`
  );
  for (const t of tarifs) {
    insert.run(estimationId, t.cle, t.tarifJournalier);
  }
}

// ---------------------------------------------------------------------------
// UO et tarifs propres à une estimation — initialisés depuis les paramètres
// globaux à la création, puis modifiables indépendamment sans impacter ni
// les paramètres globaux ni les autres estimations.
// ---------------------------------------------------------------------------

export function modifierUoEstimation(
  estimationId: string,
  cle: string,
  type: string,
  pourcentage: number
): void {
  const db = getDb();
  db.prepare(
    `UPDATE estimation_uo SET pourcentage = ? WHERE estimationId = ? AND cle = ? AND type = ?`
  ).run(pourcentage, estimationId, cle, type);
}

export function modifierTarifEstimation(
  estimationId: string,
  cle: string,
  tarifJournalier: number
): void {
  const db = getDb();
  db.prepare(
    `UPDATE estimation_tarifs SET tarifJournalier = ? WHERE estimationId = ? AND cle = ?`
  ).run(tarifJournalier, estimationId, cle);
}

// ---------------------------------------------------------------------------
// CMS / technologies — liste administrable, proposée à la création d'une
// estimation. Un CMS n'est jamais supprimé (seulement désactivé) pour ne pas
// invalider les estimations existantes qui le référencent déjà.
// ---------------------------------------------------------------------------

interface LigneCmsTechnologie {
  id: string;
  nom: string;
  actif: number;
  ordre: number;
}

function versCmsTechnologie(ligne: LigneCmsTechnologie): CmsTechnologie {
  return { id: ligne.id, nom: ligne.nom, actif: !!ligne.actif, ordre: ligne.ordre };
}

export function listerCmsTechnologies(): CmsTechnologie[] {
  const db = getDb();
  const lignes = db
    .prepare(`SELECT id, nom, actif, ordre FROM cms_technologies ORDER BY ordre ASC, nom ASC`)
    .all() as LigneCmsTechnologie[];
  return lignes.map(versCmsTechnologie);
}

export function creerCmsTechnologie(nom: string): CmsTechnologie {
  const db = getDb();
  const nomNettoye = nom.trim();
  const existante = db
    .prepare(`SELECT id FROM cms_technologies WHERE LOWER(nom) = LOWER(?)`)
    .get(nomNettoye);
  if (existante) {
    throw new Error("cms_nom_deja_utilise");
  }
  const maxOrdre = db
    .prepare(`SELECT COALESCE(MAX(ordre), -1) AS maxOrdre FROM cms_technologies`)
    .get() as { maxOrdre: number };
  const ligne: LigneCmsTechnologie = {
    id: randomUUID(),
    nom: nomNettoye,
    actif: 1,
    ordre: maxOrdre.maxOrdre + 1,
  };
  db.prepare(
    `INSERT INTO cms_technologies (id, nom, actif, ordre) VALUES (@id, @nom, @actif, @ordre)`
  ).run(ligne);
  return versCmsTechnologie(ligne);
}

export function modifierCmsTechnologie(
  id: string,
  input: { nom?: string; actif?: boolean }
): CmsTechnologie | null {
  const db = getDb();
  const existante = db
    .prepare(`SELECT id, nom, actif, ordre FROM cms_technologies WHERE id = ?`)
    .get(id) as LigneCmsTechnologie | undefined;
  if (!existante) return null;

  const nomNettoye = input.nom?.trim();
  if (nomNettoye && nomNettoye.toLowerCase() !== existante.nom.toLowerCase()) {
    const conflit = db
      .prepare(`SELECT id FROM cms_technologies WHERE LOWER(nom) = LOWER(?) AND id != ?`)
      .get(nomNettoye, id);
    if (conflit) {
      throw new Error("cms_nom_deja_utilise");
    }
  }

  const maj: LigneCmsTechnologie = {
    ...existante,
    nom: nomNettoye || existante.nom,
    actif: input.actif === undefined ? existante.actif : input.actif ? 1 : 0,
  };
  db.prepare(`UPDATE cms_technologies SET nom = @nom, actif = @actif WHERE id = @id`).run(maj);
  return versCmsTechnologie(maj);
}
