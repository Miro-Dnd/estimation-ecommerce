# Guide de contribution

## Branches

- `main` : toujours déployable, protégée (PR obligatoire + CI verte).
- `feature/<sujet>` ou `fix/<sujet>` : une branche courte par
  fonctionnalité ou correctif, supprimée après merge.
- Pas de branche `develop` séparée : équipe restreinte, on garde le flux
  simple (trunk-based).

## Commits

[Conventional Commits](https://www.conventionalcommits.org/) :
`feat: ...`, `fix: ...`, `docs: ...`, `refactor: ...`, `chore: ...`,
`test: ...`. Sert à générer le [CHANGELOG.md](../CHANGELOG.md).

## Pull requests

- Une PR par fonctionnalité/correctif, description courte : quoi, pourquoi.
- CI doit passer (lint, typecheck, tests, build) avant merge.
- Revue par au moins une autre personne quand l'équipe le permet ; sinon,
  auto-revue avec la checklist ci-dessous avant de merger.

## Checklist avant merge

1. **Impact fonctionnel et technique** décrit dans la PR.
2. **Fichiers créés/modifiés** cohérents avec le changement annoncé.
3. **Migration** ajoutée si le schéma change, et **réversible** (voir
   ci-dessous).
4. **Tests** ajoutés ou mis à jour pour la logique touchée (au minimum les
   fonctions pures de `src/lib/`).
5. **Documentation** mise à jour si le comportement, l'API, le modèle de
   données ou le déploiement changent : `docs/`, `README.md`, ou
   `DEPLOIEMENT-RAILWAY.md` selon le cas. Une décision technique
   structurante (nouveau choix d'outil, changement d'architecture) mérite
   un ADR dans `docs/decisions/`.
6. **Procédure de retour arrière** évidente : si la PR ajoute une
   migration, vérifier qu'un rollback du code reste possible sans perte de
   données (voir [05-guide-deploiement.md](05-guide-deploiement.md)).

## Ajouter une fonctionnalité — méthode

1. Lire [02-spec-fonctionnelle.md](02-spec-fonctionnelle.md) et
   [03-spec-technique.md](03-spec-technique.md) pour situer le changement.
2. Si le schéma de données change : écrire la migration (Drizzle, à partir
   de son introduction en V1 — voir
   [decisions/002-sqlite-vs-postgres.md](decisions/002-sqlite-vs-postgres.md)),
   jamais une modification destructive sans étape intermédiaire compatible
   avec l'ancien code.
3. Écrire/adapter les tests des fonctions pures concernées
   (`src/lib/calculations.ts` en particulier) avant ou pendant
   l'implémentation.
4. Mettre à jour la documentation vivante concernée.
5. Vérifier manuellement dans le navigateur (voir la mention dans
   `AGENTS.md`/`CLAUDE.md` du dépôt : Next.js d'une version récente,
   toujours vérifier les conventions dans
   `node_modules/next/dist/docs/` avant d'écrire du code Next.js).

## Commandes utiles

```bash
npm run lint        # ESLint
npx tsc --noEmit     # Vérification des types
npm run test         # Tests unitaires (Vitest)
npm run build        # Build de production (échoue si un des points ci-dessus échoue)
```
