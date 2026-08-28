# 002 — Rester sur SQLite (pas de migration vers PostgreSQL pour l'instant)

**Statut** : Acceptée — 2026-08-28

## Contexte

L'exigence initiale demandait une base "relationnelle simple, robuste et
courante" permettant "une connexion facile avec n8n". SQLite (déjà en
place) est relationnel, simple et robuste, mais n8n n'a pas de nœud natif
SQLite (contrairement à PostgreSQL, qui dispose d'un nœud dédié pour de
l'accès SQL direct).

Deux options ont été présentées :
1. Rester sur SQLite, et exposer n8n uniquement via l'API REST et les
   webhooks de l'application (pas d'accès SQL direct).
2. Migrer vers PostgreSQL dès maintenant, pour permettre à la fois l'accès
   via l'API et un accès SQL direct depuis n8n.

## Décision

Rester sur SQLite. L'intégration n8n prévue (V1) passe par l'API
`/api/v1/*` et des webhooks sortants — c'est aussi la manière la plus sûre
d'exposer l'application (contrôle de la logique métier, pas de couplage au
schéma interne). Un accès SQL direct depuis n8n n'apporte rien que l'API ne
couvre pas pour les besoins actuels (créer/mettre à jour/consulter des
estimations et lignes).

## Conséquences

- Zéro dépendance d'infrastructure supplémentaire (pas de base managée à
  provisionner/opérer) — cohérent avec l'objectif "peu de complexité
  opérationnelle".
- Un seul process, une seule instance : pas de scaling horizontal tant que
  la donnée reste un fichier SQLite sur volume local. Non bloquant pour un
  usage interne d'une petite équipe.
- Point de réévaluation explicite : si un besoin réel d'accès SQL direct
  depuis n8n apparaît, ou si la concurrence en écriture devient un
  problème (usage nettement élargi), rouvrir cette décision et migrer vers
  PostgreSQL (Railway propose une base managée en un clic). Le passage par
  un ORM (voir migrations versionnées dans la roadmap V1) est conçu pour
  rendre cette migration possible sans réécriture complète de
  `src/lib/db.ts`.
