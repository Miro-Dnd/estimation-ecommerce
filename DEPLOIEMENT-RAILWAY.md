# Déployer l'application sur Railway (guide pas à pas)

Ce guide permet de mettre l'application en ligne, avec une adresse unique
accessible à toute l'équipe, sans avoir besoin de GitHub ni de compétences
techniques poussées. On utilise [Railway](https://railway.com), un service
d'hébergement qui sait construire l'application directement à partir du
`Dockerfile` déjà présent dans le projet.

**Coût réel à prévoir** : Railway propose un essai gratuit de 5$ de crédit
pendant 30 jours, sans carte bancaire. Passé ce délai (ou ce crédit), il faut
ajouter une carte et le coût réel pour une petite application qui reste
allumée en permanence avec son espace de stockage est d'environ **5$/mois
minimum** (facturation à l'usage, avec un plancher de 5$/mois sur le plan
payant le plus bas). Il n'existe pas d'offre qui reste gratuite indéfiniment
pour une application qui tourne 24h/24 avec une base de données persistante
— c'est le cas chez tous les hébergeurs équivalents (Render, Fly.io…), pas
une particularité de Railway.

## Étape 0 — Prérequis

Vous devez avoir Node.js installé (voir l'étape précédente) et le dossier
`estimation-ecommerce` du projet sur votre machine.

## Étape 1 — Installer l'outil Railway

Dans un terminal :

```bash
npm install -g @railway/cli
```

## Étape 2 — Se connecter

```bash
railway login
```

Cela ouvre votre navigateur pour créer un compte Railway ou vous connecter
(par email ou GitHub). Aucune carte bancaire n'est demandée à cette étape.

## Étape 3 — Créer le projet Railway

Toujours dans le terminal, en étant bien positionné dans le dossier du
projet :

```bash
cd chemin/vers/estimation-ecommerce
railway init
```

Choisissez un nom, par exemple `estimation-ecommerce`.

## Étape 4 — Déployer

```bash
railway up
```

Railway détecte automatiquement le `Dockerfile` du projet ("Using detected
Dockerfile!") et construit l'application. Cette première construction prend
quelques minutes.

## Étape 5 — Ajouter le stockage persistant (obligatoire)

Sans cette étape, toutes les estimations seraient perdues à chaque
redémarrage du service. Cela se fait uniquement depuis le tableau de bord
web (pas en ligne de commande) :

1. Ouvrez [railway.com/dashboard](https://railway.com/dashboard) et ouvrez le
   projet créé.
2. Sur le canevas du projet, faites un clic droit (ou `⌘K` / `Ctrl+K`) et
   choisissez **Volume**.
3. Reliez ce volume au service de l'application.
4. Dans les réglages du volume, indiquez comme chemin de montage :
   ```
   /app/data
   ```
   (c'est exactement le dossier où l'application stocke son fichier
   `estimations.db`).

## Étape 6 — Configurer le port

Dans les réglages du service (**Variables**), ajoutez une variable
d'environnement :

```
PORT=3000
```

## Étape 7 — Obtenir l'adresse publique

Toujours dans les réglages du service : **Settings → Networking → Public
Networking → Generate Domain**. Railway fournit alors une adresse du type
`estimation-ecommerce-production.up.railway.app`, accessible en HTTPS par
toute l'équipe.

## Étape 8 — Vérifier

Ouvrez l'adresse générée : le tableau de bord des estimations doit
s'afficher, vide au départ (c'est normal, c'est une base neuve). Créez une
estimation de test pour vérifier que tout fonctionne, puis vous pouvez la
supprimer.

## Mettre à jour l'application plus tard

Après une modification du code, il suffit de relancer, depuis le dossier du
projet :

```bash
railway up
```

Les données (le contenu de `data/`) ne sont jamais touchées par un
redéploiement : elles vivent dans le volume, indépendamment du code.

## Sauvegarder les données

Depuis le terminal, en étant dans le dossier du projet :

```bash
railway volume list
railway volume files download /estimations.db ./estimations.db
```

(le nom exact du fichier à indiquer peut être vérifié avec
`railway volume browse` juste avant, qui affiche le contenu du volume). Le
dashboard Railway (section **Volumes** du projet) propose aussi ses propres
outils de sauvegarde/restauration point-in-time sur les plans payants.
