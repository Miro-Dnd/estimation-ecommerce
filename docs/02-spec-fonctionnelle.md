# Spécification fonctionnelle

État réel du code au moment de la rédaction (MVP). Les écarts avec les
exigences cibles sont signalés en **⚠️ Écart**.

## Écrans

### Tableau de bord (`/`, `EstimationsDashboard`)

Liste toutes les estimations (nom, client, CMS, statut, nombre de besoins,
total jours, coût total, dernière modification). Actions : créer, ouvrir,
dupliquer, supprimer.

- **Création** (`NewEstimationDialog`) : demande le **nom**, le **CMS /
  technologie** (obligatoire, choisi dans la liste administrable — voir
  `/parametres`) et le **client** (optionnel). L'API `POST /api/estimations`
  refuse la création si `cms` est absent ou vide (`400`).
  - ⚠️ **Écart résiduel** : la contrainte n'est appliquée qu'à la création,
    pas au niveau de la colonne SQLite (`cms TEXT`, toujours nullable) — une
    estimation créée avant cette évolution peut encore avoir un CMS vide.
    L'éditeur permet de le compléter a posteriori. Un `NOT NULL` en base
    demanderait une réécriture de table (SQLite ne sait pas altérer une
    contrainte de colonne existante) ; reporté à l'introduction des
    migrations Drizzle (V1).

### Éditeur d'estimation (`/estimations/[id]`, `EstimationEditor`)

En-tête éditable : nom, client, description, CMS (liste déroulante sourcée
depuis la liste administrable de `/parametres` — voir plus bas), taux
journalier par défaut, statut (`brouillon` / `final`). Sauvegarde
automatique différée (debounce, voir `useEntitySaver`) — pas de bouton
"Enregistrer" explicite.

Onglets :
1. **Synthèse** — totaux globaux et sous-totaux par catégorie / par
   version-priorité (`SummaryPanel`), tous phases confondues.
2. **Conception générale** — structure fixe en 5 blocs (Initialisation du
   projet, Conception fonctionnelle, Conception technique, Restitution,
   Pilotage) ; temps saisi directement par profil (Tech Expert, Consultant,
   Designer, Chef de projet, Resp. de projets), pas de répartition UO.
3. **Design / Réalisation / Transition / Autres charges** — un tableau par
   phase (`PhaseTab` + `EstimationTable`), lignes groupées dynamiquement par
   catégorie (texte libre). Pour chaque ligne : besoin client, réponse au
   besoin, catégorie, version/priorité, temps Design UI / Front / Back /
   Config (jours), temps total et coût calculés automatiquement.
4. **UO** — paramétrage, propre à cette estimation, de la répartition en %
   de chaque type de temps (Design/Front/Back/Config) sur les éléments UO
   (profils), et des tarifs journaliers par élément. Initialisé à la
   création à partir des paramètres globaux (`/parametres`), puis
   indépendant.
5. **Analyse** — ventilation du temps et du coût par profil métier (Chef de
   projet, Développeur Front…), TJM moyen pondéré du projet.

Table de lignes (`EstimationTable`) : ajout, édition inline (`EditableCell`),
duplication, suppression (avec confirmation), réordonnancement par
glisser-déposer (@dnd-kit) — désactivé dès qu'un filtre ou un regroupement
est actif, pour ne pas réordonner un sous-ensemble de façon ambiguë.

Barre de filtres (`FiltersBar`) : recherche texte, filtre par catégorie,
filtre par version/priorité, regroupement (liste simple / par catégorie /
par version).

#### Personnalisation de la grille (redimensionnement, colonnes masquables)

Sur les tableaux de phase (Design/Réalisation/Transition/Autres charges,
hors Conception générale — structure différente, non concernée) :

- **Redimensionnement** : glisser la bordure droite d'un en-tête de colonne,
  ou la bordure basse d'une ligne (poignée révélée au survol de la
  gouttière de gauche). Chaque dimension est bornée (min/max par colonne,
  40–400px pour les lignes) pour rester lisible. Double-clic sur une
  poignée = réinitialise cette colonne/ligne à sa valeur par défaut.
  Accessible au clavier : `Tab` pour atteindre une poignée (rôle
  `separator`), flèches pour ajuster (Maj+flèche = pas plus large),
  Entrée/Espace pour réinitialiser.
- **Colonnes masquables** : bouton "Colonnes" dans la barre de filtres →
  panneau listant les 10 colonnes de données, chacune activable/
  désactivable. Seule **Besoin client** est verrouillée (« Requise ») —
  c'est le seul contenu qui identifie la ligne ; tout le reste, y compris
  les colonnes de calcul (Temps total, Coût de la ligne), reste masquable
  sans jamais affecter les totaux (ceux-ci sont calculés à partir des
  données, jamais du rendu de la grille). "Tout afficher" réaffiche tout en
  un clic ; "Réinitialiser les dimensions…" remet largeurs et hauteurs par
  défaut après confirmation (les colonnes masquées ne sont pas concernées
  par ce reset, volontairement une action distincte).
- **Persistance** : `localStorage`, par navigateur — voir
  [03-spec-technique.md](03-spec-technique.md) pour la justification
  (pas d'authentification aujourd'hui) et [07-roadmap.md](07-roadmap.md)
  pour la migration prévue vers une persistance par utilisateur.

⚠️ **Écart** : aucun export (CSV/Excel/PDF) n'existe aujourd'hui.
⚠️ **Écart** : aucun champ hypothèses / exclusions / risques.
⚠️ **Écart** : aucun historique des modifications (seul `updatedAt` est
suivi, pas de trace de qui a fait quoi).

### Paramètres (`/parametres`)

Réglages **globaux**, partagés par toutes les estimations futures (n'affecte
pas les estimations existantes, cf. règle métier dans
[01-spec-generale.md](01-spec-generale.md)) :
- `ParametresUoEditor` : % de répartition par défaut de chaque type de temps
  sur les éléments UO.
- `RepartitionUoEditor` : tarif journalier par défaut de chaque élément.
- `CmsTechnologiesEditor` : liste administrable des CMS/technologies
  proposés à la création d'une estimation (ajout, désactivation — jamais de
  suppression physique, pour ne pas invalider les estimations existantes qui
  référencent déjà un nom désactivé).

⚠️ **Écart** : pas encore d'écran d'administration pour la liste des
catégories (toujours une constante de suggestions dans
`src/lib/constants.ts`, champ libre en pratique).

## Règles de calcul

Voir [src/lib/calculations.ts](../src/lib/calculations.ts), fonctions
pures et testées (cf. [07-roadmap.md](07-roadmap.md) pour l'état des tests) :
- `calculerTotauxLigne` / `calculerTotauxLigneUnifie` : temps et coût d'une
  ligne, avec un traitement dédié pour la phase Conception générale (temps
  par profil direct) vs les autres phases (répartition UO).
- `calculerTauxParType` : taux journalier composite par type de temps, issu
  de la répartition UO × tarifs. Si aucune répartition n'est configurée pour
  un type, retombe sur le taux journalier de l'estimation (jamais un coût à
  0 par défaut de configuration).
- `calculerTotauxGlobaux`, `calculerTotauxParGroupe`, `calculerBilanPhases`,
  `calculerTempsParProfil`, `calculerTjmMoyenProjet` : agrégations pour la
  Synthèse et l'Analyse.

## Droits

⚠️ **Écart majeur** : aucune authentification aujourd'hui. Toute personne
disposant de l'URL peut créer, modifier ou supprimer n'importe quelle
estimation. Voir [docs/decisions/003-auth-authjs-credentials.md](decisions/003-auth-authjs-credentials.md)
et [07-roadmap.md](07-roadmap.md) (V1).

## Cas limites déjà gérés dans le code

- Catégorie/version vide → regroupée sous `(non renseigné)` plutôt
  qu'ignorée (`calculerTotauxParGroupe`).
- Répartition UO à 0% pour un type de temps → coût basé sur le taux
  journalier de l'estimation plutôt que sur un coût nul.
- Duplication d'une estimation → copie sa propre répartition UO/tarifs (pas
  les paramètres globaux courants), pour préserver l'état exact de
  l'original.
- Réordonnancement désactivé si un filtre ou un regroupement masque une
  partie des lignes (éviterait un réordonnancement incohérent).

## Cas limites à couvrir (pas encore gérés)

- Suppression d'un CMS ou d'une catégorie encore référencé(e) par des
  estimations existantes (n'existe pas tant que ces listes ne sont pas
  administrables en base).
- Concurrence d'édition entre deux utilisateurs sur la même estimation (pas
  de verrou ni de fusion — le dernier `PATCH` gagne).
