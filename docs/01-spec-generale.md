# Spécification générale

## Vision

Outil interne pour l'équipe Presales e-commerce : transformer un besoin
client (brief, cahier des charges) en une estimation projet structurée,
chiffrée ligne par ligne, avec des totaux fiables et une synthèse
présentable en avant-vente.

## Objectifs

- Remplacer le chiffrage sur tableur par un outil dédié, plus fiable
  (calculs automatiques) et plus rapide à faire évoluer.
- Permettre à plusieurs personnes de travailler sur les mêmes estimations
  (V1), avec un historique de qui a changé quoi.
- Rendre le chiffrage exploitable par des automatisations (API, n8n) et par
  Claude en assistance de saisie (V2), sans jamais lui laisser écraser une
  saisie utilisateur sans validation.

## Périmètre

Dans le périmètre :
- Création et édition d'estimations de projets e-commerce/CMS.
- Chiffrage ligne par ligne (besoin → réponse → temps par nature de charge).
- Paramétrage des taux journaliers et de la répartition des charges par
  profil (unités d'œuvre).
- Exports et partage des estimations.

Hors périmètre (au moins jusqu'à V2) :
- Facturation, contractualisation, signature électronique.
- Suivi de projet en cours de réalisation (ce n'est pas un outil de gestion
  de projet, seulement de chiffrage en amont).
- Gestion fine des droits (RBAC détaillé) — V1 vise une authentification
  simple, pas une matrice de permissions.

## Utilisateurs

- **Consultant Presales** : crée et édite des estimations, au quotidien.
- **Manager Presales / Direction** : consulte, valide, exporte pour le
  client.
- **Administrateur** : gère les référentiels partagés (CMS, catégories,
  tarifs par défaut, comptes utilisateurs).

Jusqu'à la mise en place de l'authentification (V1), l'application est
utilisée sans distinction d'utilisateur — toute personne ayant l'URL peut
tout modifier. C'est un état transitoire acceptable pour un MVP à usage
interne restreint, pas pour un déploiement plus large.

## Règles métier structurantes

- Une estimation est **toujours** rattachée à une technologie e-commerce ou
  CMS (obligatoire dès la création).
- Le temps et le coût d'une ligne se déduisent automatiquement des champs
  saisis — jamais saisis à la main.
- Une estimation est organisée en phases (Conception générale, Design,
  Réalisation, Transition, Autres charges) ; chaque ligne appartient à une
  seule phase.
- Modifier les paramètres globaux de répartition ou de tarifs n'affecte pas
  rétroactivement les estimations déjà créées : chaque estimation a sa
  propre copie, éditable indépendamment (cf.
  [03-spec-technique.md](03-spec-technique.md)).

Voir [07-roadmap.md](07-roadmap.md) pour le découpage MVP / V1 / V2 et l'état
d'avancement réel de chaque exigence.
