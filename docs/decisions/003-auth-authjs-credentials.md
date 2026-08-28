# 003 — Authentification V1 : Auth.js avec identifiants email/mot de passe

**Statut** : Acceptée — 2026-08-28

## Contexte

L'application n'a aujourd'hui aucune authentification : toute personne
disposant de l'URL peut tout modifier. La V1 doit introduire un accès
multi-utilisateurs. Deux options ont été présentées : identifiants
email/mot de passe (Auth.js "credentials"), ou SSO Google Workspace.

## Décision

Email + mot de passe via Auth.js. Choix le plus simple à mettre en place,
sans dépendance à un fournisseur d'identité externe ni hypothèse sur le
domaine Google Workspace de l'équipe. Les comptes seront créés
manuellement ou par invitation (pas d'auto-inscription ouverte, vu le
caractère interne de l'outil).

## Conséquences

- Nouvelle table `users` (+ table de sessions Auth.js) dans le schéma —
  voir [03-spec-technique.md](../03-spec-technique.md).
- Nécessite le stockage sécurisé des mots de passe (hash, jamais en clair)
  — géré par Auth.js.
- Un SSO (Google Workspace ou autre) reste une évolution possible plus
  tard si le besoin apparaît (moins de friction de connexion), sans
  remettre en cause le modèle de données `users` si Auth.js est utilisé
  dès le départ (ajout d'un provider, pas une réécriture).
