# Guide de déploiement

Le déploiement de référence (Railway, pas à pas complet : CLI, volume
persistant, domaine public, sauvegarde) est documenté dans
[DEPLOIEMENT-RAILWAY.md](../DEPLOIEMENT-RAILWAY.md) à la racine du dépôt.

## Résumé du flux de mise à jour

1. Merge sur `main` (après revue de PR, CI verte — voir
   [06-guide-contribution.md](06-guide-contribution.md)).
2. Déploiement : `railway up` (manuel pour l'instant — l'automatisation via
   GitHub Actions est prévue en V1, voir [07-roadmap.md](07-roadmap.md)).
3. Le dossier `data/` (volume Railway) n'est jamais touché par un
   redéploiement : le code et les données sont découplés.

## Retour arrière

En cas de problème après un déploiement :
- Redéployer la version précédente : `git checkout <tag-ou-commit-precedent>`
  puis `railway up` depuis ce commit (ou utiliser le bouton "Redeploy" d'un
  déploiement antérieur dans le dashboard Railway, qui ne touche pas au
  code local).
- Les données ne sont pas affectées par un rollback de code — sauf si le
  déploiement problématique a exécuté une migration de schéma. Toute
  migration devra donc être écrite pour rester compatible avec la version
  de code précédente le temps du rollback (voir
  [06-guide-contribution.md](06-guide-contribution.md)).
