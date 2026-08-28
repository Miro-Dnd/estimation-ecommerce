# Changelog

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [Non publié]

### Added
- CMS/technologie obligatoire à la création d'une estimation, et
  administrable (ajout, désactivation) depuis `/parametres` — remplace la
  liste figée `CMS_SUGGERES`.
- Documentation vivante (`docs/`) : spécifications générale, fonctionnelle
  et technique, guides d'installation/déploiement/contribution, roadmap
  MVP/V1/V2, journal de décisions techniques (ADR).
- Intégration continue (GitHub Actions) : lint, vérification des types,
  tests, build sur chaque pull request.
- Premiers tests unitaires (Vitest) sur `src/lib/calculations.ts`.

## [0.1.0] — MVP initial

Première version fonctionnelle, développée avant la mise en place du dépôt
Git : création/édition d'estimations, grille de lignes éditable avec calcul
automatique des temps et coûts, catégories et versions/priorités,
paramétrage des unités d'œuvre et des tarifs (global et par estimation),
filtres/recherche/regroupement, réordonnancement par glisser-déposer,
onglets Synthèse/phases/UO/Analyse, déploiement Railway (Docker + volume
persistant).
