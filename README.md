# DAME PWA

Extension WordPress et Application Web Progressive (PWA) Ionic/Vue pour l'association DAME.

## Architecture

- `includes/` : Classes PHP du plugin WordPress (`DAME_PWA`).
- `pwa/` : Application Ionic 7 + Vue 3 + Pinia + TanStack Query.
  - `src/components/agenda/` : Composants de la vue Agenda (`AgendaSegmentView.vue`, `AgendaCalendarView.vue`).
  - `src/stores/agenda.ts` : Store Pinia gérant la récupération des événements de l'agenda et leurs catégories.

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
