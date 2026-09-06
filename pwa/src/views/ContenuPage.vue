<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="coursParentInfo ? `/cours/${coursParentInfo.cours.id}` : '/apprentissage/cours'"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ decodeHtmlEntities(contenuActuel?.titre) || 'Contenu' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button v-if="coursParentInfo" :router-link="`/cours/${coursParentInfo.cours.id}`" router-direction="back">
            <ion-icon slot="icon-only" :icon="listOutline"></ion-icon>
          </ion-button>
          <ion-button router-link="/apprentissage/cours" router-direction="back">
            <ion-icon slot="icon-only" :icon="homeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="ionContentRef" :fullscreen="true" class="ion-padding">
      <div class="safe-area-wrapper">
        <ion-header v-if="contenuActuel?.post_type === 'roi_lecon'" collapse="condense">
          <ion-toolbar>
            <ion-title size="large">{{ decodeHtmlEntities(contenuActuel?.titre) || 'Contenu' }}</ion-title>
          </ion-toolbar>
        </ion-header>

        <div v-if="isPageLoading" class="ion-text-center ion-padding spinner-container">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Chargement du contenu...</p>
        </div>

        <div v-else-if="contenuActuel" class="exercice-container">
          <!-- Rendu d'une leçon -->
          <div v-if="contenuActuel.post_type === 'roi_lecon'" class="lecon-wrapper">
            <LeconReader :contenuHtml="contenuActuel.contenu_html || ''" class="lecon-content ion-padding" />
            <ion-button v-if="!estReussi" expand="block" class="ion-margin-top" @click="validerLecon">
              J'ai compris, terminer la leçon
            </ion-button>
          </div>

          <!-- Rendu d'un exercice -->
          <div v-else-if="contenuActuel.post_type === 'roi_exercice'">
            <component 
              v-if="contenuActuel.type !== undefined && getComposantExercice(contenuActuel.type)"
              :is="getComposantExercice(contenuActuel.type)" 
              :config="({
                ...contenuActuel.config,
                id: contenuActuel.id,
                metaTitre: decodeHtmlEntities(contenuActuel.titre),
                metaTypeLabel: getContenuTypeLabel(contenuActuel),
                metaChapitreNiveauLabel: formatChapitreNiveauLabel(contenuActuel.chapitre_nom, contenuActuel.niveau)
              } as Record<string, unknown>)"
              :id="contenuActuel.id"
              :key="contenuActuel.id"
              @success="onSuccess"
            />
            <div v-else class="ion-text-center ion-padding error-container">
              <p>Type d'exercice non supporté (Type {{ contenuActuel.type }}).</p>
            </div>
          </div>

          <!-- Success Card (pour les leçons et pour les types d'exercices n'utilisant pas encore SeriesCardFooter) -->
          <transition name="fade">
            <ion-card v-if="estReussi && !aSeriesFooter" class="success-card ion-margin-top">
              <ion-card-header>
                <ion-card-title class="success-title">
                  {{ contenuActuel.post_type === 'roi_lecon' ? '🎉 Leçon terminée !' : '🎉 Exercice réussi !' }}
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p class="success-subtitle">
                  {{ contenuActuel.post_type === 'roi_lecon' ? 'Vous avez validé cette leçon avec succès.' : 'Félicitations, vous avez trouvé la bonne séquence de coups.' }}
                </p>
                <div class="action-buttons ion-margin-top">
                  <ion-button 
                    v-if="prochainElement" 
                    expand="block" 
                    color="success" 
                    class="next-btn"
                    @click="allerAuSuivant"
                  >
                    {{ prochainElement.type === 'roi_lecon' ? 'Leçon suivante' : 'Exercice suivant' }}
                  </ion-button>
                  <ion-button 
                    v-else
                    expand="block" 
                    color="success" 
                    router-link="/tabs/apprentissage"
                  >
                    Terminer le cours
                  </ion-button>
                  <ion-button 
                    v-if="coursParentInfo"
                    expand="block" 
                    fill="outline" 
                    color="medium" 
                    :router-link="`/cours/${coursParentInfo.cours.id}`"
                  >
                    Retour au cours
                  </ion-button>
                </div>
              </ion-card-content>
            </ion-card>
          </transition>
        </div>

        <div v-else class="ion-text-center ion-padding error-container">
          <p>Impossible de charger ce contenu.</p>
        </div>
      </div>
    </ion-content>

    <!-- Footer Fixe Unifié pour les Exercices utilisant SeriesCardFooter -->
    <ion-footer v-show="!isPageLoading && aSeriesFooter" class="exercise-ion-footer">
      <div ref="footerPortalRef" class="exercise-footer-portal"></div>
    </ion-footer>
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
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonFooter
} from '@ionic/vue';
import { ref, computed, watch, onUnmounted, provide, nextTick } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useApprentissageStore } from '@/stores/apprentissage';
import { EXERCISE_NAVIGATION_KEY } from '@/composables/useExerciseNavigation';
import { fireExerciseCelebration } from '@/composables/useCelebration';
import TypeABCDaire from './types/TypeABCDaire.vue';
import Type100Commandements from './types/Type100Commandements.vue';
import TypePopEchecs from './types/TypePopEchecs.vue';
import TypePartieHeros from './types/TypePartieHeros.vue';
import TypePosiPlan from './types/TypePosiPlan.vue';
import TypeAssociPlan from './types/TypeAssociPlan.vue';
import TypeMarcheHeros from './types/TypeMarcheHeros.vue';
import TypeVisionChecs from './types/TypeVisionChecs.vue';
import TypeParcours from './types/TypeParcours.vue';
import TypeEchecEval from './types/TypeEchecEval.vue';
import TypeClassEchecs from './types/TypeClassEchecs.vue';
import TypeQuiSuisJe from './types/TypeQuiSuisJe.vue';
import TypeOuvreBoite from './types/TypeOuvreBoite.vue';
import TypeCapOuPasCap from './types/TypeCapOuPasCap.vue';
import TypeJugementFinal from './types/TypeJugementFinal.vue';
import TypeDestinationFinale from './types/TypeDestinationFinale.vue';
import LeconReader from '@/components/apprentissage/LeconReader.vue';
import { listOutline, homeOutline } from 'ionicons/icons';
import { decodeHtmlEntities, getContenuTypeLabel, formatChapitreNiveauLabel } from '@/utils/stringUtils';

const route = useRoute();
const router = useRouter();
const apprentissageStore = useApprentissageStore();
const isLoading = ref(true);
const isPageLoading = computed(() => isLoading.value || apprentissageStore.isContenuLoading);
const estReussi = ref(false);
const contenuActuel = computed(() => apprentissageStore.contenuActuel);

const TYPES_AVEC_SERIES_FOOTER = [1, 2, 3, 4, 5, 8];

const aSeriesFooter = computed(() => {
  return contenuActuel.value?.post_type === 'roi_exercice' &&
    TYPES_AVEC_SERIES_FOOTER.includes(contenuActuel.value.type ?? 0);
});

const footerPortalRef = ref<HTMLElement | null>(null);
const ionContentRef = ref<ComponentPublicInstance | null>(null);

provide('exerciseFooterPortal', footerPortalRef);

const coursParentInfo = computed(() => {
  if (!contenuActuel.value || apprentissageStore.parcours.length === 0) {
    return null;
  }
  for (const cours of apprentissageStore.parcours) {
    const idx = cours.playlist.findIndex(item => item.id === contenuActuel.value?.id);
    if (idx !== -1) {
      return { cours, idx };
    }
  }
  return null;
});

const prochainElement = computed(() => {
  const info = coursParentInfo.value;
  if (!info) return null;
  const { cours, idx } = info;
  if (idx < cours.playlist.length - 1) {
    return cours.playlist[idx + 1];
  }
  return null;
});

const getComposantExercice = (type: number) => {
  if (type === 1) {
    return Type100Commandements;
  }
  if (type === 2) {
    return TypePopEchecs;
  }
  if (type === 3) {
    return TypeABCDaire;
  }
  if (type === 4) {
    return TypePartieHeros;
  }
  if (type === 5) {
    return TypePosiPlan;
  }
  if (type === 6) {
    return TypeAssociPlan;
  }
  if (type === 7) {
    return TypeMarcheHeros;
  }
  if (type === 8) {
    return TypeVisionChecs;
  }
  if (type === 9) {
    return TypeParcours;
  }
  if (type === 10) {
    return TypeEchecEval;
  }
  if (type === 11) {
    return TypeClassEchecs;
  }
  if (type === 12) {
    return TypeQuiSuisJe;
  }
  if (type === 13) {
    return TypeOuvreBoite;
  }
  if (type === 14) {
    return TypeCapOuPasCap;
  }
  if (type === 15) {
    return TypeJugementFinal;
  }
  if (type === 16) {
    return TypeDestinationFinale;
  }
  return null;
};

const startTime = ref<number>(Date.now());

const getElapsedTimeSeconds = (): number => {
  return Math.max(1, Math.round((Date.now() - startTime.value) / 1000));
};

let currentValidationPromise: Promise<void> | null = null;

const onSuccess = async (): Promise<void> => {
  if (estReussi.value && currentValidationPromise) {
    await currentValidationPromise;
    return;
  }
  estReussi.value = true;
  // Déclencher la célébration pour les leçons et les exercices n'ayant pas SeriesCardFooter
  if (!aSeriesFooter.value) {
    fireExerciseCelebration();
  }
  if (contenuActuel.value) {
    const idToValidate = contenuActuel.value.id;
    const elapsed = getElapsedTimeSeconds();
    currentValidationPromise = apprentissageStore.validerElement(idToValidate, elapsed);
    await currentValidationPromise;
  }
};

const validerLecon = async () => {
  await onSuccess();
};

const allerAuSuivant = async () => {
  if (currentValidationPromise) {
    try {
      await currentValidationPromise;
    } catch {
      // ignore
    }
  }
  if (prochainElement.value) {
    router.push(`/contenu/${prochainElement.value.id}`);
  } else {
    router.push('/tabs/apprentissage');
  }
};

const retourAuCours = async () => {
  if (currentValidationPromise) {
    try {
      await currentValidationPromise;
    } catch {
      // ignore
    }
  }
  if (coursParentInfo.value) {
    router.push(`/cours/${coursParentInfo.value.cours.id}`);
  } else {
    router.push('/tabs/apprentissage');
  }
};

// Contexte de navigation fourni à SeriesCardFooter pour les exercices
provide(EXERCISE_NAVIGATION_KEY, {
  hasNext: computed(() => !!prochainElement.value),
  nextLabel: computed(() => {
    if (!prochainElement.value) {
      return 'Terminer le cours';
    }
    return prochainElement.value.type === 'roi_lecon' ? 'Leçon suivante' : 'Exercice suivant';
  }),
  hasCourse: computed(() => !!coursParentInfo.value),
  courseUrl: computed(() => {
    if (coursParentInfo.value) {
      return `/cours/${coursParentInfo.value.cours.id}`;
    }
    return '/tabs/apprentissage';
  }),
  onNext: allerAuSuivant,
  onCourse: retourAuCours,
  onSuccess: onSuccess,
});

const loadContenu = async (idVal: string | string[] | number) => {
  isLoading.value = true;
  estReussi.value = false;
  currentValidationPromise = null;
  startTime.value = Date.now();
  const id = typeof idVal === 'number' ? idVal : parseInt(Array.isArray(idVal) ? idVal[0] : idVal, 10);
  if (!isNaN(id)) {
    await apprentissageStore.fetchContenu(id);
    if (apprentissageStore.parcours.length === 0) {
      await apprentissageStore.fetchParcours();
    }
    if (apprentissageStore.elementsValides.length === 0) {
      await apprentissageStore.fetchProgression();
    }
    if (
      contenuActuel.value?.post_type === 'roi_lecon' &&
      apprentissageStore.elementsValides.includes(id)
    ) {
      estReussi.value = true;
    }
  }
  isLoading.value = false;
  nextTick(() => {
    ionContentRef.value?.$el?.scrollToTop?.(0);
  });
};

watch(
  () => route.params.id,
  async (newId) => {
    if (newId) {
      await loadContenu(newId);
    }
  },
  { immediate: true }
);

watch(
  () => contenuActuel.value,
  (newContenu) => {
    if (newContenu?.titre) {
      document.title = decodeHtmlEntities(newContenu.titre);
    } else {
      document.title = 'Contenu';
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  document.title = 'Echiquier Lédonien';
});
</script>

<style scoped>
ion-content::part(scroll) {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.safe-area-wrapper {
  padding-left: var(--ion-safe-area-left, 0);
  padding-right: var(--ion-safe-area-right, 0);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.spinner-container, .error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  flex: 1;
}

.exercice-container {
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.success-card {
  border-left: 5px solid var(--ion-color-success);
  margin-top: 16px;
  background: var(--ion-card-background, var(--ion-item-background, #fff));
  border-radius: 8px;
}

.success-title {
  color: var(--ion-color-success);
  font-weight: bold;
  font-size: 1.25rem;
}

.success-subtitle {
  font-size: 1rem;
  color: var(--ion-color-step-600, #666);
  margin: 0;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.next-btn {
  font-weight: 600;
}

.lecon-content {
  background: var(--ion-card-background, var(--ion-item-background, #fff));
  border-radius: 8px;
  line-height: 1.6;
  font-size: 1.1rem;
}

/* Transistions */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.exercise-ion-footer {
  background: var(--ion-background-color, #ffffff);
  border-top: 1px solid var(--ion-color-step-150, #e0e0e0);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.04);
  padding-top: 8px;
  padding-bottom: max(16px, calc(12px + env(safe-area-inset-bottom, 0px)), calc(12px + var(--ion-safe-area-bottom, 0px)));
  padding-left: max(12px, calc(12px + env(safe-area-inset-left, 0px)), calc(12px + var(--ion-safe-area-left, 0px)));
  padding-right: max(12px, calc(12px + env(safe-area-inset-right, 0px)), calc(12px + var(--ion-safe-area-right, 0px)));
  box-sizing: border-box;
}

.exercise-ion-footer[style*="display: none"] {
  display: none !important;
}

.exercise-footer-portal {
  width: 100%;
}
</style>
