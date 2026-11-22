<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/apprentissage"></ion-back-button>
        </ion-buttons>
        <ion-title>Cours & Parcours</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <!-- Refresher pour le tirage vers le bas (pull-to-refresh) -->
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="safe-area-wrapper">
        <ion-header collapse="condense">
          <ion-toolbar>
            <ion-title size="large">Cours & Parcours</ion-title>
          </ion-toolbar>
        </ion-header>

        <!-- État de chargement -->
        <div v-if="apprentissageStore.isLoading" class="ion-text-center ion-padding spinner-container">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Chargement des parcours...</p>
        </div>

        <!-- Aucun cours -->
        <div v-else-if="apprentissageStore.parcours.length === 0" class="ion-text-center ion-padding empty-container">
          <ion-icon :icon="schoolOutline" size="large" color="medium"></ion-icon>
          <p class="ion-margin-top">Aucun cours disponible pour le moment.</p>
        </div>

        <!-- Liste des cours -->
        <div v-else class="courses-wrapper">
          <!-- CARTE REPRENDRE LA PROGRESSION -->
          <ion-card
            v-if="prochainAReprendre"
            :color="prochainAReprendre.cours.chapitre_couleur || 'primary'"
            button
            :router-link="`/contenu/${prochainAReprendre.item.id}`"
            class="resume-progress-card"
          >
            <ion-card-header>
              <div class="resume-header">
                <div class="resume-meta">
                  <span class="resume-eyebrow">
                    <ion-icon :icon="playCircleOutline"></ion-icon>
                    Reprendre
                  </span>
                  <ion-card-subtitle class="resume-path">
                    N{{ prochainAReprendre.cours.niveau }} · {{ getShortChapterLabel(prochainAReprendre.cours.chapitre_nom) }} · {{ decodeHtmlEntities(prochainAReprendre.cours.titre) }}
                  </ion-card-subtitle>
                  <ion-card-title class="resume-title">
                    {{ decodeHtmlEntities(prochainAReprendre.item.titre) || `Exercice #${prochainAReprendre.playlistIndex + 1}` }}
                  </ion-card-title>
                </div>
                <ion-icon :icon="arrowForwardOutline" class="resume-arrow"></ion-icon>
              </div>
            </ion-card-header>
          </ion-card>

          <!-- SECTION 1 : COURS ASSIGNÉS PAR LES ENTRAÎNEURS -->
          <div v-if="apprentissageStore.coursAssignes.length > 0" class="assigned-section">
            <div class="section-title-wrapper">
              <h2 class="section-title">
                <ion-icon :icon="bookmarkOutline" class="section-icon"></ion-icon>
                Cours assignés
              </h2>
              <span class="section-badge">{{ apprentissageStore.coursAssignes.length }}</span>
            </div>
            <p class="section-subtitle">Sélectionnés et prescrits par vos entraîneurs</p>

            <div class="list-container">
              <ion-card
                v-for="cours in apprentissageStore.coursAssignes"
                :key="'assigned-' + cours.id"
                :color="cours.chapitre_couleur"
                :button="true"
                :router-link="`/tabs/apprentissage/cours/${cours.id}`"
                class="cours-card assigned-card"
              >
                <ion-card-header>
                  <div class="cours-header-wrapper">
                    <div>
                      <ion-card-subtitle>
                        <span class="assigned-tag">📌 Assigné</span>
                        Niveau {{ cours.niveau }} — {{ decodeHtmlEntities(cours.chapitre_nom) }}
                      </ion-card-subtitle>
                      <ion-card-title>{{ decodeHtmlEntities(cours.titre) }}</ion-card-title>
                    </div>
                    <div class="progress-pill">
                      {{ getCourseProgress(cours) }}
                    </div>
                  </div>
                </ion-card-header>
              </ion-card>
            </div>
          </div>

          <!-- SECTION 2 : MÉTHODE EEF (TRONC COMMUN) -->
          <div class="tronc-section">
            <div class="level-header-bar" :class="{ 'ion-margin-top': apprentissageStore.coursAssignes.length > 0 }">
              <div class="section-title-wrapper">
                <h2 class="section-title">
                  <ion-icon :icon="schoolOutline" class="section-icon"></ion-icon>
                  Méthode EEF
                </h2>
              </div>

              <!-- Sélecteur de niveau dynamique (visible seulement si >= 2 niveaux en base) -->
              <ion-select
                v-if="apprentissageStore.niveauxDisponibles.length > 1"
                v-model="selectedNiveau"
                interface="popover"
                aria-label="Sélectionner le niveau"
                class="level-select"
                @ionChange="onNiveauChange"
              >
                <ion-select-option
                  v-for="niv in apprentissageStore.niveauxDisponibles"
                  :key="niv"
                  :value="niv"
                >
                  Niveau {{ niv }}
                </ion-select-option>
              </ion-select>
              <ion-badge v-else-if="selectedNiveau !== null" color="medium" class="level-badge">
                Niveau {{ selectedNiveau }}
              </ion-badge>
            </div>

            <!-- Onglets par chapitre (1er mot du nom du chapitre) -->
            <ion-segment
              v-if="chapitresDuNiveau.length > 0"
              :value="selectedChapitre"
              scrollable
              class="chapter-segment"
              @ionChange="onChapterChange($event.detail.value as string)"
            >
              <ion-segment-button
                v-for="chap in chapitresDuNiveau"
                :key="chap.nom"
                :value="chap.nom"
                class="chapter-segment-btn"
              >
                <ion-label>
                  {{ getShortChapterLabel(chap.nom) }}
                  <span class="chapter-count">({{ chap.completed }}/{{ chap.total }})</span>
                </ion-label>
              </ion-segment-button>
            </ion-segment>

            <div class="list-container">
              <ion-card
                v-for="cours in coursDuChapitreSelectionne"
                :key="cours.id"
                :color="cours.chapitre_couleur"
                :class="{ 'locked': !isCourseUnlocked(cours) }"
                :button="isCourseUnlocked(cours)"
                :router-link="isCourseUnlocked(cours) ? `/tabs/apprentissage/cours/${cours.id}` : undefined"
                class="cours-card"
              >
                <ion-card-header>
                  <div class="cours-header-wrapper">
                    <ion-card-title class="cours-card-title">{{ decodeHtmlEntities(cours.titre) }}</ion-card-title>
                    <ion-icon
                      v-if="!isCourseUnlocked(cours)"
                      :icon="lockClosedOutline"
                      class="lock-icon"
                    ></ion-icon>
                    <div v-else class="progress-pill">
                      {{ getCourseProgress(cours) }}
                    </div>
                  </div>
                </ion-card-header>
              </ion-card>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonSpinner,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonBadge,
  IonRefresher,
  IonRefresherContent,
  type RefresherCustomEvent
} from '@ionic/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useApprentissageStore } from '@/stores/apprentissage';
import { useAuthStore } from '@/stores/auth';
import type { CoursItem } from '@/types/roi';
import { decodeHtmlEntities } from '@/utils/stringUtils';
import {
  schoolOutline,
  lockClosedOutline,
  bookmarkOutline,
  playCircleOutline,
  arrowForwardOutline
} from 'ionicons/icons';

const route = useRoute();
const authStore = useAuthStore();
const apprentissageStore = useApprentissageStore();

const selectedNiveau = ref<number | null>(null);
const selectedChapitre = ref<string>('');
const hasUserSelectedNiveau = ref(false);
const hasUserSelectedChapter = ref(false);

const prochainAReprendre = computed(() => apprentissageStore.prochainContenuAReprendre);

interface ChapitreSummary {
  nom: string;
  completed: number;
  total: number;
}

const chapitresDuNiveau = computed<ChapitreSummary[]>(() => {
  if (selectedNiveau.value === null) return [];
  const map = new Map<string, ChapitreSummary>();
  for (const cours of apprentissageStore.coursTroncCommun) {
    if (cours.niveau !== selectedNiveau.value) continue;
    const nom = cours.chapitre_nom || 'Chapitre';
    let entry = map.get(nom);
    if (!entry) {
      entry = { nom, completed: 0, total: 0 };
      map.set(nom, entry);
    }
    entry.total += 1;
    const playlist = cours.playlist || [];
    const isCompleted =
      playlist.length > 0 &&
      playlist.every((item) => apprentissageStore.elementsValides.includes(item.id));
    if (isCompleted) {
      entry.completed += 1;
    }
  }
  return Array.from(map.values());
});

const coursDuChapitreSelectionne = computed<CoursItem[]>(() => {
  if (selectedNiveau.value === null) return [];
  return apprentissageStore.coursTroncCommun.filter(
    (c) =>
      c.niveau === selectedNiveau.value &&
      (!selectedChapitre.value || (c.chapitre_nom || 'Chapitre') === selectedChapitre.value)
  );
});

const getShortChapterLabel = (nom: string): string => {
  const decoded = decodeHtmlEntities(nom).trim();
  if (!decoded) return 'Chapitre';
  return decoded.split(/\s+/)[0] || decoded;
};

const onNiveauChange = () => {
  hasUserSelectedNiveau.value = true;
  hasUserSelectedChapter.value = false;
};

const onChapterChange = (value: string) => {
  if (value && value !== selectedChapitre.value) {
    hasUserSelectedChapter.value = true;
    selectedChapitre.value = value;
  }
};

const syncDefaultSelection = () => {
  const levels = apprentissageStore.niveauxDisponibles;
  if (levels.length === 0) {
    selectedNiveau.value = null;
    selectedChapitre.value = '';
    return;
  }

  const queryNiveau = Number(route.query.niveau);
  if (!Number.isNaN(queryNiveau) && levels.includes(queryNiveau)) {
    selectedNiveau.value = queryNiveau;
  } else if (!hasUserSelectedNiveau.value || selectedNiveau.value === null || !levels.includes(selectedNiveau.value)) {
    const resumeLevel = prochainAReprendre.value?.cours.niveau;
    selectedNiveau.value =
      resumeLevel !== undefined && levels.includes(resumeLevel) ? resumeLevel : levels[0];
  }

  const chaps = chapitresDuNiveau.value;
  if (chaps.length === 0) {
    selectedChapitre.value = '';
    return;
  }

  const queryChap = typeof route.query.chapitre === 'string' ? route.query.chapitre : '';
  if (queryChap && chaps.some((c) => c.nom === queryChap)) {
    selectedChapitre.value = queryChap;
  } else if (!hasUserSelectedChapter.value || !chaps.some((c) => c.nom === selectedChapitre.value)) {
    const resume = prochainAReprendre.value;
    const resumeChap =
      resume && resume.cours.niveau === selectedNiveau.value
        ? resume.cours.chapitre_nom
        : undefined;
    selectedChapitre.value =
      resumeChap && chaps.some((c) => c.nom === resumeChap) ? resumeChap : chaps[0].nom;
  }
};

watch(
  () => [
    apprentissageStore.niveauxDisponibles,
    prochainAReprendre.value,
    selectedNiveau.value,
    route.query.niveau,
    route.query.chapitre
  ],
  () => {
    syncDefaultSelection();
  },
  { immediate: true }
);

const getCourseProgress = (cours: CoursItem): string => {
  const playlist = cours.playlist || [];
  if (playlist.length === 0) return '0/0';
  const validated = playlist.filter((item) =>
    apprentissageStore.elementsValides.includes(item.id)
  ).length;
  return `${validated}/${playlist.length}`;
};

const isCourseUnlocked = (cours: CoursItem): boolean => {
  const idx = apprentissageStore.parcours.findIndex((c) => c.id === cours.id);
  if (idx < 0) return true;
  return apprentissageStore.isCoursUnlocked(idx);
};

const loadData = async (force = false) => {
  if (authStore.isAuthenticated && authStore.canAccessApprentissage) {
    await Promise.all([
      apprentissageStore.fetchParcours(force),
      apprentissageStore.fetchProgression(force)
    ]);
  }
};

const handleRefresh = async (event: RefresherCustomEvent) => {
  await loadData(true);
  event.target.complete();
};

watch(() => [authStore.isAuthenticated, authStore.canAccessApprentissage], () => {
  loadData();
});

onMounted(async () => {
  await loadData();
});
</script>
