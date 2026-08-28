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
- `cms_technologies` (liste administrable, remplace `CMS_SUGGERES`)
- `categories` (liste administrable, remplace `CATEGORIES_SUGGEREES`)
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
