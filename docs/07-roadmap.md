# Roadmap — MVP / V1 / V2

Document vivant : on coche au fur et à mesure, on ajoute une ligne au
[CHANGELOG.md](../CHANGELOG.md) à chaque livraison.

## MVP — chiffrage manuel, mono-utilisateur

Déjà en place :
- [x] Création/édition/suppression/duplication d'estimations
- [x] Grille de lignes éditable (ajout, édition, suppression, duplication,
      réordonnancement par glisser-déposer)
- [x] Calcul automatique des temps et coûts (ligne, sous-totaux, totaux)
- [x] Catégories / chapitres, version/priorité (texte libre avec
      suggestions)
- [x] Champ CMS/technologie sur l'estimation
- [x] Filtres, recherche, tri, regroupement
- [x] Persistance SQLite locale + déploiement Railway

Reste à faire pour clore le MVP proprement :
- [ ] Rendre le CMS obligatoire (UI de création + contrainte en base) et
      administrable (table `cms_technologies` au lieu de la constante
      `CMS_SUGGERES`)
- [ ] Export CSV
- [ ] Champ hypothèses / exclusions / risques sur l'estimation
- [ ] Historique minimal des modifications (au moins : quoi, quand — même
      sans multi-utilisateur pour l'instant)
- [ ] Git + dépôt GitHub + CI de base (lint/typecheck/tests/build) — **en
      cours**, voir ce commit
- [ ] Premiers tests unitaires sur `src/lib/calculations.ts`

## V1 — multi-utilisateurs, API, intégrations

- [ ] Authentification (Auth.js, email + mot de passe — voir
      [decisions/003-auth-authjs-credentials.md](decisions/003-auth-authjs-credentials.md))
- [ ] Catégories administrables (table `categories`)
- [ ] Migrations versionnées et réversibles (introduction de Drizzle,
      voir [decisions/002-sqlite-vs-postgres.md](decisions/002-sqlite-vs-postgres.md))
- [ ] API `/api/v1/*` documentée (payloads d'exemple), authentifiée par
      token
- [ ] Webhooks sortants : `estimation.created`, `estimation.updated`,
      `estimation.validated`, `estimation.exported`
- [ ] Export Excel et PDF
- [ ] Déploiement continu (GitHub Actions → Railway sur merge `main`)
- [ ] Test d'intégration n8n (un workflow simple consommant l'API/les
      webhooks)

## V2 — assistance Claude, import Google Drive

- [ ] Import d'un document depuis Google Drive (lien ou sélection)
- [ ] Analyse du document par Claude (proxy serveur, clé API jamais
      exposée au client)
- [ ] Proposition structurée de lignes (besoin, réponse, catégorie,
      version, charges estimées avec hypothèses explicites)
- [ ] Écran de relecture/validation avant intégration dans la grille —
      aucune écriture silencieuse
- [ ] Signalement des ambiguïtés, dépendances, risques et informations
      manquantes détectées par Claude
- [ ] Reporting avancé

## Évolutions ultérieures

À définir selon les retours utilisateurs une fois V2 en usage.
