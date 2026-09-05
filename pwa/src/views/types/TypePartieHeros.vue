<template>
  <div class="exercice-type-partie-heros">
    <!-- En-tête Unifié de l'exercice -->
    <ExerciseHeader
      :title="headerMeta.title"
      :typeLabel="headerMeta.typeLabel"
      :chapitreNiveauLabel="headerMeta.chapitreNiveauLabel"
      :consigne="consigneActuelle"
      :stepBadgeText="`Étape ${etapeCouranteIndex + 1} / ${totalEtapes}`"
    />

    <div class="etape-container">
      <!-- 1. Étape de Défilement / Visionnage PGN -->
      <div v-if="etapeActuelle.type === 'pgn'" class="stage-pgn-wrapper animate-fade-in">
        <div class="chessboard-container">
          <Chessboard
            :key="`pgn-${etapeCouranteIndex}`"
            mode="game"
            :fen="activePgnFen"
            :orientation="etapeActuelle.orientation"
            :player-color="etapeActuelle.orientation"
            :shapes="activePgnShapes"
            :view-only="true"
            @board-created="onPgnBoardCreated"
          />
        </div>

        <!-- Contrôles de Navigation PGN -->
        <div class="navigation-controls">
          <ion-button
            fill="outline"
            color="primary"
            class="nav-btn"
            :disabled="currentPgnMoveIndex < 0"
            @click="viewPgnStart"
            title="Début"
          >
            <ion-icon slot="icon-only" :icon="playBackOutline" />
          </ion-button>
          <ion-button
            fill="outline"
            color="primary"
            class="nav-btn"
            :disabled="currentPgnMoveIndex < 0"
            @click="viewPgnPrevious"
            title="Précédent"
          >
            <ion-icon slot="icon-only" :icon="chevronBackOutline" />
          </ion-button>
          <ion-button
            fill="outline"
            color="primary"
            class="nav-btn"
            :disabled="isPgnAtEnd"
            @click="viewPgnNext"
            title="Suivant"
          >
            <ion-icon slot="icon-only" :icon="chevronForwardOutline" />
          </ion-button>
        </div>

        <!-- Affichage du Commentaire du Coup Courant (hauteur constante réservée pour éviter les sauts d'interface) -->
        <div class="comment-container" :class="{ 'comment-empty': !activePgnComment }">
          <p class="comment-text">
            {{ activePgnComment ? '💬 ' + activePgnComment : '' }}
          </p>
        </div>
      </div>

      <!-- 2. Étape de Choix Interactif QCM -->
      <div v-else-if="etapeActuelle.type === 'qcm'" class="stage-qcm-wrapper animate-fade-in">
        <div class="chessboard-container">
          <Chessboard
            :key="`qcm-${etapeCouranteIndex}`"
            mode="game"
            :fen="activeQcmFen"
            :shapes="etapeActuelle.shapes"
            :orientation="etapeActuelle.orientation"
            :player-color="etapeActuelle.orientation"
            :view-only="true"
            @board-created="onQcmBoardCreated"
          />
        </div>

        <ion-card class="exercise-card">
          <ion-card-content>
            <div class="qcm-choices">
              <ion-button
                v-for="(choix, index) in etapeActuelle.choices"
                :key="index"
                expand="block"
                fill="solid"
                :color="couleurBoutonQcm(index)"
                :disabled="isQcmSolved"
                class="choice-btn"
                @click="validerChoixQcm(index)"
              >
                {{ choix.label }}
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Footer Unique de Navigation par Carte pour TypePartieHeros -->
      <SeriesCardFooter
        :currentCard="etapeCouranteIndex + 1"
        :totalCards="totalEtapes"
        :isSolved="isCurrentStageSolved"
        :feedback="currentStageFeedback"
        :pendingHint="currentStagePendingHint"
        badgePrefix="Étape"
        nextText="Étape suivante"
        finishText="Terminer l'exercice"
        @next="passerEtapeSuivante"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import {
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
} from '@ionic/vue';
import {
  playBackOutline,
  chevronBackOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { Chessboard } from '@/components/shared/Chessboard';
import type { BoardCore, DrawShape } from 'eg-chessboard';
import ExerciseHeader from '@/components/shared/ExerciseHeader.vue';
import SeriesCardFooter, { type CardFeedback } from '@/components/shared/SeriesCardFooter.vue';
import { useApprentissageStore } from '@/stores/apprentissage';
import { useFeedback } from '@/composables/useFeedback';
import {
  parsePartieHerosPgn,
  shuffleChoices,
  type PartieHerosStage,
  type PgnStage,
  type QcmStage,
} from '@/utils/partieHerosParser';

export interface ConfigPartieHeros {
  consigne?: string;
  pgn?: string;
  // Rétrocompatibilité ancien format
  etapes?: Array<{
    type: 'pgn' | 'qcm';
    pgn_data?: string;
    fen?: string;
    question?: string;
    choix?: string[];
    bonne_reponse?: number;
    shapes?: DrawShape[];
  }>;
  metaTitre?: string;
  metaTypeLabel?: string;
  metaChapitreNiveauLabel?: string;
}

const props = defineProps<{
  config: ConfigPartieHeros;
  id: number;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const store = useApprentissageStore();
const { showSuccess } = useFeedback();

const normalizedConfig = computed<Record<string, any>>(() => {
  let cfg: any = props.config;
  if (typeof cfg === 'string') {
    try {
      cfg = JSON.parse(cfg);
    } catch (e) {
      console.warn('Erreur JSON parse props.config:', e);
    }
  }
  if (cfg && typeof cfg.raw_json === 'string') {
    try {
      cfg = { ...cfg, ...JSON.parse(cfg.raw_json) };
    } catch (e) {
      console.warn('Erreur JSON parse raw_json:', e);
    }
  }
  if (cfg && typeof cfg.config === 'string') {
    try {
      cfg = { ...cfg, ...JSON.parse(cfg.config) };
    } catch (e) {
      // ignore
    }
  }
  if (cfg && typeof cfg.config === 'object' && cfg.config !== null) {
    cfg = { ...cfg, ...cfg.config };
  }
  return (cfg && typeof cfg === 'object') ? cfg : {};
});

const headerMeta = computed(() => ({
  title: normalizedConfig.value.metaTitre || 'T4 - Partie du Héros',
  typeLabel: normalizedConfig.value.metaTypeLabel || 'Partie du Héros',
  chapitreNiveauLabel: normalizedConfig.value.metaChapitreNiveauLabel || '',
}));

const etapeCouranteIndex = ref(0);

const rawPgn = computed<string>(() => {
  const cfg = normalizedConfig.value;
  if (cfg.pgn && typeof cfg.pgn === 'string') {
    return cfg.pgn;
  }
  if (cfg.pgn_data && typeof cfg.pgn_data === 'string') {
    return cfg.pgn_data;
  }
  if ((props as any).pgn && typeof (props as any).pgn === 'string') {
    return (props as any).pgn;
  }
  return '';
});

// Découpage automatique de la partie en étapes séquentielles
const etapesListe = computed<PartieHerosStage[]>(() => {
  const cfg = normalizedConfig.value;
  if (rawPgn.value) {
    return parsePartieHerosPgn(rawPgn.value, cfg.consigne);
  }

  // Rétrocompatibilité avec l'ancien format multi-étapes JSON
  if (cfg.etapes && Array.isArray(cfg.etapes) && cfg.etapes.length > 0) {
    const convertedStages: PartieHerosStage[] = [];
    for (const item of cfg.etapes) {
      if (item.type === 'pgn' && (item.pgn_data || item.pgn)) {
        const sub = parsePartieHerosPgn(item.pgn_data || item.pgn);
        convertedStages.push(...sub);
      } else if (item.type === 'qcm') {
        const choices = (item.choix || []).map((txt: string, idx: number) => ({
          san: txt,
          label: txt,
          isCorrect: idx === (item.bonne_reponse ?? 0),
          explanation: idx === (item.bonne_reponse ?? 0) ? 'Bonne réponse !' : 'Mauvaise réponse !',
        }));
        convertedStages.push({
          type: 'qcm',
          fen: item.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          orientation: 'white',
          shapes: item.shapes || [],
          question: item.question || 'Quel est le meilleur coup ?',
          choices: shuffleChoices(choices),
        });
      }
    }
    if (convertedStages.length > 0) {
      return convertedStages;
    }
  }

  return [
    {
      type: 'pgn',
      fenDepart: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      orientation: 'white',
      moves: [],
      startingComment: '',
    },
  ];
});

const totalEtapes = computed(() => etapesListe.value.length);

const etapeActuelle = computed<PartieHerosStage>(() => {
  return (
    etapesListe.value[etapeCouranteIndex.value] || {
      type: 'pgn',
      fenDepart: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      orientation: 'white',
      moves: [],
      startingComment: '',
    }
  );
});

const consigneActuelle = computed<string>(() => {
  if (etapeActuelle.value.type === 'qcm') {
    return etapeActuelle.value.question || props.config?.consigne || 'Trouver le meilleur coup.';
  }
  return props.config?.consigne || 'Revivez la partie du héros et trouvez le bon coup.';
});

// ==========================================
// 1. ÉTAT & CONTRÔLE DE L'ÉTAPE PGN
// ==========================================
const pgnBoardApi = ref<BoardCore | null>(null);
const currentPgnMoveIndex = ref(-1);
const isPgnCompleted = ref(false);

const isPgnAtEnd = computed<boolean>(() => {
  const stage = etapeActuelle.value as PgnStage;
  if (!stage || stage.type !== 'pgn' || !stage.moves) {
    return true;
  }
  return currentPgnMoveIndex.value >= stage.moves.length - 1;
});

const activePgnFen = computed<string>(() => {
  const stage = etapeActuelle.value as PgnStage;
  if (!stage || stage.type !== 'pgn') {
    return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  }
  if (currentPgnMoveIndex.value < 0 || !stage.moves[currentPgnMoveIndex.value]) {
    return stage.fenDepart;
  }
  return stage.moves[currentPgnMoveIndex.value].fenAfter;
});

const activePgnShapes = computed<DrawShape[]>(() => {
  const stage = etapeActuelle.value as PgnStage;
  if (!stage || stage.type !== 'pgn') {
    return [];
  }
  if (currentPgnMoveIndex.value < 0) {
    return stage.startingShapes || [];
  }
  const move = stage.moves[currentPgnMoveIndex.value];
  return move?.shapes || [];
});

const activePgnComment = computed<string>(() => {
  const stage = etapeActuelle.value as PgnStage;
  if (!stage || stage.type !== 'pgn') {
    return '';
  }
  if (currentPgnMoveIndex.value < 0) {
    return stage.startingComment || '';
  }
  const move = stage.moves[currentPgnMoveIndex.value];
  return move?.comment || '';
});

const syncPgnBoardPosition = () => {
  if (!pgnBoardApi.value) return;
  const stage = etapeActuelle.value as PgnStage;
  if (!stage || stage.type !== 'pgn') return;

  const targetFen = activePgnFen.value;
  const targetShapes = activePgnShapes.value;

  pgnBoardApi.value.setPosition(targetFen);
  pgnBoardApi.value.setShapes(targetShapes);
  if (typeof pgnBoardApi.value.redraw === 'function') {
    pgnBoardApi.value.redraw(true);
  }
};

const onPgnBoardCreated = (api: BoardCore) => {
  pgnBoardApi.value = api;
  syncPgnBoardPosition();
};

const resetStageState = (stage?: PartieHerosStage) => {
  const current = stage || etapeActuelle.value;
  if (!current) return;

  if (current.type === 'pgn') {
    currentPgnMoveIndex.value = -1;
    isPgnCompleted.value = !current.moves || current.moves.length === 0;
    selectedChoiceIndex.value = null;
    isQcmSolved.value = false;
    qcmFeedback.value = null;
  } else if (current.type === 'qcm') {
    selectedChoiceIndex.value = null;
    isQcmSolved.value = false;
    qcmFeedback.value = null;
    activeQcmFen.value = current.fen;
    currentPgnMoveIndex.value = -1;
    isPgnCompleted.value = false;
  }
};

const initPgnStage = (stage?: PgnStage) => {
  const current = stage || (etapeActuelle.value as PgnStage);
  currentPgnMoveIndex.value = -1;
  isPgnCompleted.value = !current?.moves || current.moves.length === 0;
  selectedChoiceIndex.value = null;
  isQcmSolved.value = false;
  qcmFeedback.value = null;
  syncPgnBoardPosition();
};

const viewPgnStart = () => {
  currentPgnMoveIndex.value = -1;
  syncPgnBoardPosition();
};

const viewPgnPrevious = () => {
  if (currentPgnMoveIndex.value > -1) {
    currentPgnMoveIndex.value--;
    syncPgnBoardPosition();
  }
};

const viewPgnNext = () => {
  const stage = etapeActuelle.value as PgnStage;
  if (!stage || stage.type !== 'pgn' || !stage.moves) return;

  if (currentPgnMoveIndex.value < stage.moves.length - 1) {
    currentPgnMoveIndex.value++;
    syncPgnBoardPosition();
    if (currentPgnMoveIndex.value === stage.moves.length - 1) {
      isPgnCompleted.value = true;
    }
  }
};

// ==========================================
// 2. ÉTAT & CONTRÔLE DE L'ÉTAPE QCM
// ==========================================
const qcmBoardApi = ref<BoardCore | null>(null);
const selectedChoiceIndex = ref<number | null>(null);
const isQcmSolved = ref(false);
const qcmFeedback = ref<CardFeedback | null>(null);
const activeQcmFen = ref('');

const onQcmBoardCreated = (api: BoardCore) => {
  qcmBoardApi.value = api;
  initQcmStage();
};

const initQcmStage = (stage?: QcmStage) => {
  const current = stage || (etapeActuelle.value as QcmStage);
  if (!current || current.type !== 'qcm') return;

  selectedChoiceIndex.value = null;
  isQcmSolved.value = false;
  qcmFeedback.value = null;
  activeQcmFen.value = current.fen;
  currentPgnMoveIndex.value = -1;
  isPgnCompleted.value = false;

  if (qcmBoardApi.value) {
    qcmBoardApi.value.setPosition(current.fen);
    qcmBoardApi.value.setShapes(current.shapes || []);
    if (typeof qcmBoardApi.value.redraw === 'function') {
      qcmBoardApi.value.redraw(true);
    }
  }
};

const couleurBoutonQcm = (index: number): string => {
  if (selectedChoiceIndex.value === null) {
    return 'primary';
  }
  const stage = etapeActuelle.value as QcmStage;
  const choice = stage.choices?.[index];
  if (choice && choice.isCorrect && isQcmSolved.value) {
    return 'success';
  }
  if (index === selectedChoiceIndex.value && !choice?.isCorrect) {
    return 'danger';
  }
  return 'primary';
};

const validerChoixQcm = (index: number) => {
  if (isQcmSolved.value) {
    return;
  }

  selectedChoiceIndex.value = index;
  const stage = etapeActuelle.value as QcmStage;
  const choice = stage.choices?.[index];

  if (choice && choice.isCorrect) {
    isQcmSolved.value = true;
    qcmFeedback.value = {
      type: 'success',
      message: choice.explanation || 'Bravo ! C\'est le meilleur coup.',
    };

    if (qcmBoardApi.value) {
      try {
        qcmBoardApi.value.move(choice.san);
      } catch (err) {
        console.warn('Erreur coup QCM sur échiquier:', err);
      }
    }
  } else {
    qcmFeedback.value = {
      type: 'danger',
      message: choice?.explanation || 'Ce n\'est pas le bon coup ! Réessayez.',
    };
  }
};

// ==========================================
// 3. NAVIGATION GLOBALE ENTRE LES ÉTAPES
// ==========================================
watch(etapeCouranteIndex, (newIdx) => {
  const stage = etapesListe.value[newIdx];
  if (!stage) return;
  // Réinitialisation synchrone immédiate pour éviter qu'un état solved/completed résiduel ne déclenche prématurément la victoire
  resetStageState(stage);
  nextTick(() => {
    if (stage.type === 'pgn') {
      syncPgnBoardPosition();
    } else if (stage.type === 'qcm') {
      if (qcmBoardApi.value) {
        qcmBoardApi.value.setPosition(stage.fen);
        qcmBoardApi.value.setShapes(stage.shapes || []);
        if (typeof qcmBoardApi.value.redraw === 'function') {
          qcmBoardApi.value.redraw(true);
        }
      }
    }
  });
});

watch(
  () => props.config,
  () => {
    etapeCouranteIndex.value = 0;
    const stage = etapesListe.value[0];
    if (stage) {
      resetStageState(stage);
    }
    nextTick(() => {
      if (stage?.type === 'pgn') {
        syncPgnBoardPosition();
      } else if (stage?.type === 'qcm') {
        if (qcmBoardApi.value) {
          qcmBoardApi.value.setPosition(stage.fen);
          qcmBoardApi.value.setShapes(stage.shapes || []);
          if (typeof qcmBoardApi.value.redraw === 'function') {
            qcmBoardApi.value.redraw(true);
          }
        }
      }
    });
  },
  { deep: true }
);

const isCurrentStageSolved = computed(() => {
  if (etapeActuelle.value.type === 'pgn') {
    return isPgnCompleted.value;
  }
  if (etapeActuelle.value.type === 'qcm') {
    return isQcmSolved.value;
  }
  return false;
});

const currentStageFeedback = computed<CardFeedback | null>(() => {
  if (etapeActuelle.value.type === 'qcm') {
    return qcmFeedback.value;
  }
  return null;
});

const currentStagePendingHint = computed<string>(() => {
  if (etapeActuelle.value.type === 'qcm') {
    return 'Trouvez le meilleur coup pour continuer';
  }
  return 'Visionnez tous les coups pour continuer';
});

const passerEtapeSuivante = async () => {
  if (etapeCouranteIndex.value < totalEtapes.value - 1) {
    etapeCouranteIndex.value++;
  } else {
    // Dernière étape terminée
    await showSuccess('Félicitations ! Vous avez terminé ce scénario !', 3000);
    emit('success');
  }
};
</script>

<style scoped>
.exercice-type-partie-heros {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100%;
}

.etape-container {
  width: 100%;
  max-width: 500px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  gap: 12px;
}

.stage-pgn-wrapper,
.stage-qcm-wrapper {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  gap: 6px;
}

/* Contrôles de Navigation PGN */
.navigation-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.nav-btn {
  --border-radius: 50%;
  width: 38px;
  height: 38px;
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
  margin: 0;
}

.nav-btn ion-icon {
  font-size: 1.25rem;
}

/* Bulle de Commentaire */
.comment-container {
  width: 100%;
  background: var(--ion-color-step-100, #f4f5f8);
  border-radius: 6px;
  border-left: 4px solid var(--ion-color-primary, #3880ff);
  padding: 8px 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  min-height: 42px;
  max-height: 120px;
  box-sizing: border-box;
  overflow-y: auto;
  display: flex;
  align-items: center;
}

.comment-empty {
  visibility: hidden;
  border-left-color: transparent;
  background: transparent;
  box-shadow: none;
  min-height: 42px;
  height: 42px;
}

.comment-text {
  margin: 0;
  width: 100%;
  font-size: 0.88rem;
  line-height: 1.4;
  color: var(--ion-color-step-800, #333);
}

.placeholder-text {
  color: var(--ion-color-step-400, #989aa2);
  font-style: italic;
}

/* Carte de Choix QCM */
.exercise-card {
  margin: 0;
}

.animate-fade-in {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>

