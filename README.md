# DAME PWA

Extension WordPress et Application Web Progressive (PWA) Ionic/Vue pour l'association DAME.

## Architecture

- `includes/` : Classes PHP du plugin WordPress (`DAME_PWA`).
- `pwa/` : Application Ionic 7 + Vue 3 + Pinia + TanStack Query.
  - `src/views/ApprentissageHubPage.vue` : Hub d'accueil à 2 panneaux (Cours théoriques / Espace de Jeu).
  - `src/views/ApprentissageCoursListPage.vue` : Liste des parcours et chapitres réservés aux adhérents.
  - `src/views/PlayPage.vue` : Échiquier interactif 1J (vs Stockfish 18) et 2J (Pass & Play) basé sur `eg-chessboard`.
  - `src/views/AnalysisPage.vue` : Revue et analyse coup par coup de la dernière partie jouée.
  - `src/components/agenda/` : Composants de la vue Agenda (`AgendaSegmentView.vue`, `AgendaCalendarView.vue`).
  - `src/stores/agenda.ts` : Store Pinia gérant la récupération des événements de l'agenda et leurs catégories.

## Espace de Jeu & Apprentissage

- **Hub Apprentissage** : Accessible à tous depuis la barre d'onglets, il offre un point d'entrée vers les cours théoriques (protégés par adhésion) et vers l'échiquier de jeu (libre d'accès).
- **Moteur Stockfish** : Embarqué via `eg-chessboard` avec calcul dynamique du temps de réflexion (`Elo * 1.4 ms`) et mémorisation du niveau choisi.
- **Envoi PGN** : En mode 1 joueur, les parties des adhérents connectés sont enregistrées et synchronisées avec le plugin `roi` (`POST /roi/v1/games`).

## API REST & Catégories

L'API REST WordPress (`dame`) enregistre le champ `categories_data` sur le type de contenu `dame_agenda` pour inclure la couleur de chaque catégorie (`id`, `name`, `slug`, `color`).

## Développement

```bash
# Compilation de la PWA
cd pwa
npm run build

# Linting
npm run lint
```
