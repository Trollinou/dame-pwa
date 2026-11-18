# TDD — Unification du Header et du Footer sur les 16 types d'exercices

- **Statut** : Proposé
- **Branche cible** : `refactor/unified-exercise-shell` (branche dédiée requise par `AGENTS.md`)
- **Périmètre** : `pwa/src/views/learning/ContenuPage.vue`, `pwa/src/components/learning/`, `pwa/src/views/learning/types/`, `pwa/src/composables/learning/`

---

## 1. Contexte & Problème

Actuellement, `ContenuPage.vue` orchestre l'affichage des leçons (`roi_lecon`), vidéos (`roi_video`) et des 16 types d'exercices (`roi_exercice`), avec un état d'intégration hétérogène :

1. **Footer unifié (`SeriesCardFooter.vue`) incomplet** :
   - `TYPES_AVEC_SERIES_FOOTER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 13, 14]` dans `ContenuPage.vue`.
   - Les types **10** (`TypeEchecEval`), **11** (`TypeClassEchecs`), **15** (`TypeJugementFinal`) et **16** (`TypeDestinationFinale`) n'utilisent pas `SeriesCardFooter` et reposent encore sur la *Success Card* de fallback de `ContenuPage.vue` et des boutons inline.
2. **Duplication du Header (`ContentHeader.vue`)** :
   - `ContenuPage.vue` injecte `metaTitre`, `metaTypeLabel` et `metaChapitreNiveauLabel` dans `:config` via un cast `as any`.
   - 7 composants `Type*.vue` et 6 viewers recalculent chacun un `computed headerMeta` identique pour rendre `<ContentHeader>`.
   - Les types **11**, **15** et **16** n'affichent pas `ContentHeader`.
3. **Concurrence de `<Teleport>` sur les viewers multi-phases** :
   - `PgnViewer.vue` embarque son propre `SeriesCardFooter`, alors que les types `10` (`EvalViewer`), `15` (`JugementFinalViewer`) et `16` (`TextOrderViewer`) utilisent `PgnViewer` en phase finale de solution/explication.
4. **Typage & code mort** :
   - `ContenuPage.vue` utilise une cascade de 16 `if (type === ...)` et `:config="({ ... } as any)"`.
   - `ExerciseHeader.vue` est inutilisé dans le projet.
   - `TypeEchecEval.vue`, `TypeJugementFinal.vue` et `TypeDestinationFinale.vue` importent `useApprentissageStore` sans l'utiliser.

---

## 2. Architecture Cible

### 2.1 Centralisation de `ContentHeader` via `provide/inject`

- **Nouveau composable** : `pwa/src/composables/learning/useExerciseHeader.ts`
  - Expose une clé d'injection `EXERCISE_HEADER_KEY`.
  - `ContenuPage.vue` fournit (`provide`) un état réactif `{ consigne, stepBadgeText, hideSubPanel }` ainsi qu'une méthode `setHeaderState(...)` et réinitialise cet état à chaque changement de contenu (`loadContenu`).
  - `ContenuPage.vue` rend `<ContentHeader>` une seule fois pour les `roi_exercice` au-dessus du `<component :is="...">`, avec `title`, `typeLabel` et `chapitreNiveauLabel` issus directement de `contenuActuel`.
  - Chaque `Type*.vue` (ou viewer) appelle `useExerciseHeader()` pour mettre à jour uniquement `consigne`, `stepBadgeText` et `hideSubPanel` selon la phase ou la carte active.
  - Les props `metaTitre`, `metaTypeLabel`, `metaChapitreNiveauLabel` injectées dans `config` sont supprimées.

> **Note** : `LeconReader.vue` et `VideoReader.vue` conservent leur rendu actuel (déjà aligné sur `ContentHeader` + `SeriesCardFooter`).

### 2.2 Pilotage unique de `SeriesCardFooter` sur les viewers multi-phases

- Ajouter une prop optionnelle `embedded?: boolean` (défaut `false`) à `PgnViewer.vue` :
  - Quand `embedded` est `true`, `PgnViewer.vue` ne rend pas son propre `<SeriesCardFooter>`, laissant le composant parent (`EvalViewer`, `JugementFinalViewer`, `TextOrderViewer`, et éventuellement `TypeAssociPlan`) conserver le contrôle unique du footer et des transitions de phase.

### 2.3 Typage strict dans `ContenuPage.vue`

- Remplacer `getComposantExercice(type: number)` (16 `if`) par un mapping typé `EXERCISE_COMPONENTS: Record<number, Component>`.
- Passer `:config="contenuActuel.config"` sans cast `as any`.
- Une fois les 4 derniers types migrés, supprimer `TYPES_AVEC_SERIES_FOOTER`, `aSeriesFooter` et le bloc `<!-- Success Card -->` de fallback.

---

## 3. Plan d'Implémentation par Phases

### Phase 1 — Socle commun & `PgnViewer`
1. Créer `pwa/src/composables/learning/useExerciseHeader.ts`.
2. Monter `<ContentHeader>` dans `ContenuPage.vue` pour `roi_exercice` (avec `provide(EXERCISE_HEADER_KEY, ...)`), remplacer les 16 `if` par `EXERCISE_COMPONENTS`, et nettoyer le cast `as any` dès que les types ne lisent plus `meta*`.
3. Ajouter la prop `embedded?: boolean` dans `pwa/src/components/learning/viewers/PgnViewer.vue` pour désactiver son `SeriesCardFooter` lorsqu'il est imbriqué.

### Phase 2 — Migration des 4 types restants

#### Type 10 : `TypeEchecEval.vue` / `EvalViewer.vue`
- **Header** : Utiliser `useExerciseHeader()` pour afficher dynamiquement :
  - Phase `questions` : consigne de la question active + `stepBadgeText` `Question X / N`.
  - Phase `tactique` : consigne `À vous de jouer ! Trouvez la séquence.` + badge `Tactique`.
  - Phase `solution` : consigne `Explication` + badge `Solution`.
- **Footer** : Intégrer `SeriesCardFooter` dans `EvalViewer.vue` (en passant `embedded` au `PgnViewer` de la phase `solution`, et en supprimant le bouton inline `Terminer l'exercice`).
- **Nettoyage** : Retirer `useApprentissageStore` inutilisé dans `TypeEchecEval.vue`.

#### Type 11 : `TypeClassEchecs.vue` / `OrderViewer.vue`
- **Header** : Supprimer le callout `.learning-callout--info` dans `TypeClassEchecs.vue` ; alimenter `useExerciseHeader()` avec `config.consigne` et `stepBadgeText` (`1 / 1` ou nombre d'éléments placés).
- **Footer** : Intégrer `SeriesCardFooter` dans `OrderViewer.vue` (gestion du feedback succès/erreur et bouton d'action/validation unifié).

#### Type 15 : `TypeJugementFinal.vue` / `JugementFinalViewer.vue`
- **Header** : Supprimer les `<ion-card>` de consigne/explication internes à `JugementFinalViewer.vue` et piloter `useExerciseHeader()` selon la phase (`observation` → `explication`).
- **Footer** : Intégrer `SeriesCardFooter` dans `JugementFinalViewer.vue`, passer `:embedded="true"` à `PgnViewer`, et supprimer les boutons inline de validation/fin.
- **Nettoyage** : Retirer `useApprentissageStore` inutilisé dans `TypeJugementFinal.vue`.

#### Type 16 : `TypeDestinationFinale.vue` / `TextOrderViewer.vue`
- **Header** : Supprimer les `<ion-card>` de consigne/explication internes à `TextOrderViewer.vue` et piloter `useExerciseHeader()` selon la phase (`order` → `solution`).
- **Footer** : Intégrer `SeriesCardFooter` dans `TextOrderViewer.vue` (action `Valider l'ordre` en phase `order`, puis `:embedded="true"` sur `PgnViewer` en phase `solution` pour remplacer les boutons inline).
- **Nettoyage** : Retirer `useApprentissageStore` inutilisé dans `TypeDestinationFinale.vue`.

### Phase 3 — Déduplication & Nettoyage final
1. Supprimer `TYPES_AVEC_SERIES_FOOTER`, `aSeriesFooter` et la *Success Card* de fallback dans `ContenuPage.vue`.
2. Migrer progressivement les 12 types déjà fonctionnels (`Type100Commandements`..`TypeCapOuPasCap` et leurs viewers) vers `useExerciseHeader()` pour supprimer les `<ContentHeader>` locaux et les `computed headerMeta` redondants.
3. Supprimer `pwa/src/components/learning/ExerciseHeader.vue` (code mort).

---

## 4. Critères d'Acceptation & Vérification (QA)

1. **Rendu & Ergonomie Mobile** :
   - Les 16 types d'exercices affichent tous le `ContentHeader` en haut du contenu et le `SeriesCardFooter` téléporté dans `<ion-footer>` de `ContenuPage.vue`.
   - Aucun double `<SeriesCardFooter>` simultané dans `footerPortalRef` lors des transitions de phases.
   - Respect des règles CSS (`AGENTS.md`) : zéro `<style>` / `<style scoped>` dans les `.vue`, zéro style inline non dynamique.
2. **Contrôles automatisés obligatoires** (dans `pwa/`) :
   - `npm run type-check` (`vue-tsc`) : 0 erreur, aucun `as any` ajouté.
   - `npm run lint` (`eslint`) : 0 erreur.
   - `npm run test:unit` (`vitest`) : suite complète passante, avec ajout de tests unitaires pour `useExerciseHeader` et la non-duplication du footer.
   - `npm run build` (`vite build`) : build de production valide.
