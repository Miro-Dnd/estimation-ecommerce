# Spécification technique

## Architecture

```
Navigateur
   │
   ├─ Server Components (Next.js App Router) : pages en lecture
   │     src/app/page.tsx (dashboard), src/app/estimations/[id]/page.tsx,
   │     src/app/parametres/page.tsx
   │
   ├─ Composants client ("use client") : édition interactive, appellent
   │     l'API via fetch()
   │     src/components/{dashboard,estimation,parametres,ui}/
   │
   └─ API Routes (src/app/api/**/route.ts) : toutes les écritures et
         lectures programmatiques
            │
            ├─ src/lib/db.ts        accès SQLite (schéma + requêtes)
            ├─ src/lib/calculations.ts   calculs purs (temps/coût), testés
            ├─ src/lib/constants.ts      référentiels (CMS, catégories, UO…)
            └─ src/lib/useEntitySaver.ts sauvegarde différée côté client (debounce)
```

Un seul process Node (pas de service séparé). La base SQLite est un fichier
sur disque (`data/estimations.db`), ouvert une fois par process et réutilisé
via une variable globale pour survivre au hot-reload de `next dev`.

## Modèle de données (état actuel)

```
estimations
  id (PK), nom, client, description, cms, tauxJournalier, statut,
  createdAt, updatedAt

lignes
  id (PK), estimationId (FK → estimations, cascade), ordre, phase,
  besoinClient, solutionProposee, categorie, version,
  tempsDesign, tempsFront, tempsBack, tempsConfig,
  tempsTechExpert, tempsConsultant, tempsDesigner, tempsChefDeProjet,
  tempsRespDeProjets,
  createdAt, updatedAt

parametres_uo (cle, type) PK        -- % de répartition, réglage global
  pourcentage

estimation_uo (estimationId, cle, type) PK   -- copie par estimation
  pourcentage

tarifs_uo (cle) PK                  -- tarif journalier, réglage global
  tarifJournalier

estimation_tarifs (estimationId, cle) PK     -- copie par estimation
  tarifJournalier

cms_technologies
  id (PK), nom (unique), actif, ordre
  -- liste administrable des CMS/technologies proposés à la création d'une
  -- estimation (/parametres) ; jamais de suppression physique, seulement
  -- actif=0, pour ne pas invalider les estimations qui référencent déjà un
  -- nom désactivé. estimations.cms stocke le nom choisi (pas une FK) : pas
  -- de contrainte d'intégrité référentielle, cohérent avec le choix de ne
  -- pas encore introduire d'ORM/migrations versionnées (voir plus bas).
```

Les migrations sont aujourd'hui appliquées à la main dans
`initialiserSchema()` (`CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD
COLUMN` conditionnels au démarrage). Ça fonctionne mais n'est ni versionné
ni réversible — voir
[docs/decisions/002-sqlite-vs-postgres.md](decisions/002-sqlite-vs-postgres.md)
et la roadmap V1 (introduction de Drizzle).

### Extensions prévues (V1/V2, pas encore en base)

- `users`, table de sessions (Auth.js)
- `categories` (liste administrable, remplace `CATEGORIES_SUGGEREES`)
- `user_grid_preferences` (largeurs/hauteurs/colonnes masquées par
  utilisateur — remplace le `localStorage` actuel, voir plus bas)
- `historique` (audit : entité, action, auteur, date, diff)
- `api_tokens`, `webhooks_config`

## API (état actuel)

Toutes les routes sont sous `src/app/api/`, non versionnées, non
documentées formellement (pas d'OpenAPI), non authentifiées.

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/estimations` | Liste des estimations + totaux |
| POST | `/api/estimations` | Créer une estimation |
| GET | `/api/estimations/:id` | Détail (estimation + lignes + UO + tarifs) |
| PATCH | `/api/estimations/:id` | Modifier l'en-tête d'une estimation |
| DELETE | `/api/estimations/:id` | Supprimer une estimation |
| POST | `/api/estimations/:id/duplicate` | Dupliquer une estimation |
| POST | `/api/estimations/:id/lignes` | Créer une ligne |
| PATCH | `/api/estimations/:id/lignes/:ligneId` | Modifier une ligne |
| DELETE | `/api/estimations/:id/lignes/:ligneId` | Supprimer une ligne |
| POST | `/api/estimations/:id/lignes/:ligneId/duplicate` | Dupliquer une ligne |
| POST | `/api/estimations/:id/reorder` | Réordonner les lignes |
| PATCH | `/api/estimations/:id/uo` | Modifier la répartition UO de l'estimation |
| PATCH | `/api/estimations/:id/tarifs` | Modifier les tarifs de l'estimation |
| GET/PATCH | `/api/parametres-uo` | Répartition UO globale |
| GET/PATCH | `/api/tarifs-uo` | Tarifs globaux |
| GET | `/api/cms-technologies` | Liste des CMS/technologies (actifs et inactifs) |
| POST | `/api/cms-technologies` | Créer un CMS/technologie (`409` si le nom existe déjà) |
| PATCH | `/api/cms-technologies/:id` | Renommer / activer / désactiver |

V1 introduira `/api/v1/*` versionné, documenté (payloads d'exemple), avec
authentification par token et des webhooks sortants (`estimation.created`,
`estimation.updated`, `estimation.validated`, `estimation.exported`) — voir
[07-roadmap.md](07-roadmap.md).

## Préférences de grille (redimensionnement, colonnes masquées)

Concerne `EstimationTable` (onglets Design/Réalisation/Transition/Autres
charges) — pas `ConceptionGeneraleTable`, structurellement différente et
non couverte par cette évolution.

```
src/lib/grillePreferences.ts      Types + logique pure (config des colonnes,
                                    clamp, lecture/écriture localStorage) —
                                    testée sans dépendance au DOM
src/lib/useGrillePreferences.ts   Store externe partagé (useSyncExternalStore,
                                    même principe que useIsClient) + API de
                                    mutation immuable
src/components/estimation/
  ResizeHandle.tsx                 Poignée pointer+clavier, colonne ou ligne
  ColonnesPanel.tsx                Bouton "Colonnes" + panneau de config
```

**Pourquoi `localStorage` et pas une table** : aucune authentification
n'existe aujourd'hui (voir
[decisions/003-auth-authjs-credentials.md](decisions/003-auth-authjs-credentials.md)) ;
une table `user_grid_preferences` nécessiterait un `userId` qui n'existe
pas encore. `localStorage` (par navigateur) est la meilleure approximation
disponible d'un réglage "par utilisateur" en attendant V1. Le format est
versionné (`{ version: 1, ... }`) pour permettre une migration sans perte :
à l'introduction de l'auth, une table `user_grid_preferences (userId,
gridId, preferences JSON)` pourra être peuplée en lisant une dernière fois
le `localStorage` de chaque utilisateur côté client puis en le postant à
une nouvelle route `POST /api/grille-preferences`.

**Pourquoi ce n'est pas une donnée métier** : les largeurs/hauteurs/
visibilité ne touchent ni `Ligne` ni `Estimation`, et les calculs
(`calculations.ts`) ne lisent jamais l'état de la grille — masquer ou
redimensionner ne peut donc pas fausser un total, par construction.

**Rendu** : `<table style={{tableLayout:"fixed", width: largeurTotale}}>`
+ `<colgroup>` de `<col style={{width}}>`. Note d'implémentation : Chromium
n'applique les largeurs du `colgroup` comme des valeurs absolues que si la
largeur totale de la table est explicite — avec `width:auto`, il les traite
comme de simples ratios. `largeurTotale` est donc calculée (somme des
colonnes visibles + gouttière + colonne d'actions) plutôt que laissée à
`auto`.

**Performance** : pas de virtualisation (déjà le cas avant cette évolution).
Cette fonctionnalité n'ajoute qu'une lecture d'objet en mémoire par cellule
(pas de calcul), donc n'aggrave pas les performances sur beaucoup de lignes
— mais ne résout pas non plus ce sujet, qui reste distinct.

## Sécurité (état actuel)

⚠️ Aucune authentification, aucune autorisation, aucune validation
d'entrée formalisée (pas de schéma Zod) côté API. Acceptable uniquement
pour un usage interne à accès réseau restreint, le temps de la V1
(Auth.js). À corriger avant tout partage plus large de l'URL de
production. Voir
[docs/decisions/003-auth-authjs-credentials.md](decisions/003-auth-authjs-credentials.md).

Aucun secret n'est aujourd'hui nécessaire (pas d'API externe utilisée). Les
futures clés (Anthropic, Google) seront exclusivement lues côté serveur
(variables d'environnement, jamais exposées au client) — voir
[07-roadmap.md](07-roadmap.md) V2.

## Infrastructure

- Hébergement : Railway, build via `Dockerfile` (multi-stage, sortie
  standalone Next.js), volume persistant monté sur `/app/data`. Détail pas
  à pas : [../DEPLOIEMENT-RAILWAY.md](../DEPLOIEMENT-RAILWAY.md).
- Un seul process, une seule instance : pas de scaling horizontal possible
  tant que la donnée reste un fichier SQLite sur un volume local — non
  bloquant pour un usage interne d'une petite équipe.

## Variables d'environnement

Aucune à ce jour (l'application tourne sans clé ni service externe). `PORT`
est la seule variable utilisée par le serveur Next.js en production. V1/V2
ajouteront : secret Auth.js, clé API Anthropic, identifiants OAuth Google,
URL(s) de webhook n8n — chacune documentée ici au moment de son
introduction, avec un `.env.example` tenu à jour.

## Tests

Vitest pour les fonctions pures (`src/lib/calculations.ts` en priorité, déjà
testable sans I/O). Voir [06-guide-contribution.md](06-guide-contribution.md)
pour la commande et la convention de nommage.
