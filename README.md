# Estimation e-commerce — outil interne Presales

Application interne pour construire des estimations de projets e-commerce
ligne par ligne (besoin client → solution proposée → temps estimé), avec
calcul automatique des totaux (temps, coût) et une synthèse par catégorie et
par version/priorité.

Voir `PROPOSITION-ARCHITECTURE.md` pour le détail des choix techniques.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — base de
  données SQLite en fichier local (aucun serveur de base à installer)
- Tailwind CSS
- [@dnd-kit](https://dndkit.com) pour le réordonnancement des lignes par
  glisser-déposer

Aucune clé d'API ni service externe n'est nécessaire : tout fonctionne en
local, hors-ligne, dès `npm install`.

## Démarrage local

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000). Un fichier
`data/estimations.db` est créé automatiquement au premier démarrage : c'est
là que vivent toutes les estimations. Sauvegardez ce fichier régulièrement
(ou copiez-le) pour ne rien perdre — c'est la seule donnée à protéger.

## Build de production

```bash
npm run build
npm run start
```

Par défaut le serveur écoute sur le port 3000 (`-p <port>` pour changer).

## Déploiement recommandé

L'application est un simple process Node : elle tourne sur n'importe quel
serveur Linux, VM ou conteneur, tant que le dossier `data/` est conservé
entre les redémarrages (volume persistant).

### Avec Docker

Un `Dockerfile` minimal est fourni :

```bash
docker build -t estimation-ecommerce .
docker run -p 3000:3000 -v estimation-data:/app/data estimation-ecommerce
```

### Sans Docker (VPS, PaaS classique)

```bash
npm ci
npm run build
npm run start
```

Assurez-vous simplement que le dossier `data/` persiste entre deux
déploiements (il n'est pas versionné dans git, voir `.gitignore`).

### Vercel

Possible, mais le système de fichiers de Vercel n'est pas persistant : il
faudrait alors remplacer `better-sqlite3` par une base gérée (Postgres,
Turso/LibSQL…). Pour un usage interne, un petit VPS ou PaaS classique avec
volume persistant est plus simple et moins coûteux.

## Sauvegarde des données

Toutes les données vivent dans `data/estimations.db` (un seul fichier
SQLite). Pour sauvegarder : copiez ce fichier. Pour restaurer : remplacez-le
par une copie précédente (serveur arrêté).

## Structure du projet

```
src/
  app/                    Pages (App Router) et routes API
  components/
    ui/                   Primitives d'interface (Button, Input, Combobox…)
    dashboard/            Tableau de bord des estimations
    estimation/           Éditeur d'estimation (table, filtres, synthèse)
  lib/
    db.ts                 Accès SQLite (schéma + requêtes)
    calculations.ts       Calculs de totaux (ligne, globaux, par groupe)
    useEntitySaver.ts      Sauvegarde automatique différée (debounce)
    constants.ts           Catégories/versions suggérées, taux par défaut
  types/                  Types partagés
data/                     Base SQLite (créée automatiquement, non versionnée)
```
