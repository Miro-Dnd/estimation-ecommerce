# 001 — Conserver la stack existante (Next.js + SQLite + Tailwind + dnd-kit)

**Statut** : Acceptée — 2026-08-28

## Contexte

Une première version fonctionnelle de l'application existait déjà avant la
formalisation de ce plan de développement (Next.js 16 App Router +
TypeScript, better-sqlite3, Tailwind CSS, @dnd-kit), avec un déploiement
Railway déjà documenté et opérationnel.

## Décision

Ne pas repartir de zéro. La stack existante répond déjà à l'exigence d'un
framework "reconnu, éprouvé et maintenable" et le code en place (séparation
`lib/` calculs purs / accès DB / composants) est une base saine à faire
évoluer plutôt qu'à remplacer.

## Conséquences

- Le travail se concentre sur la fermeture des écarts fonctionnels (voir
  [07-roadmap.md](../07-roadmap.md)) plutôt que sur une réécriture.
- Les décisions suivantes (base de données, authentification) s'inscrivent
  dans cette continuité plutôt que dans un choix de stack from scratch.
