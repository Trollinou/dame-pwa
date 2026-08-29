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
          <ion-button
            fill="outline"
            color="primary"
            class="nav-btn"
            :disabled="isPgnAtEnd"
            @click="viewPgnEnd"
            title="Fin"
          >
            <ion-icon slot="icon-only" :icon="playForwardOutline" />
          </ion-button>
        </div>

        <!-- Affichage du Commentaire du Coup Courant (uniquement s'il existe) -->
        <div v-if="activePgnComment" class="comment-container">
          <p class="comment-text">
            💬 {{ activePgnComment }}
          </p>
        </div>

        <!-- Footer de Navigation par Carte pour Étape PGN -->
        <SeriesCardFooter
          :currentCard="etapeCouranteIndex + 1"
          :totalCards="totalEtapes"
          :isSolved="isPgnCompleted"
          :feedback="null"
          pendingHint="Visionnez tous les coups pour continuer"
          badgePrefix="Étape"
          nextText="Étape suivante"
          finishText="Terminer l'exercice"
          @next="passerEtapeSuivante"
        />
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

        <!-- Footer de Navigation par Carte pour Étape QCM -->
        <SeriesCardFooter
          :currentCard="etapeCouranteIndex + 1"
          :totalCards="totalEtapes"
          :isSolved="isQcmSolved"
          :feedback="qcmFeedback"
          pendingHint="Trouvez le meilleur coup pour continuer"
          badgePrefix="Étape"
          nextText="Étape suivante"
          finishText="Terminer l'exercice"
          @next="passerEtapeSuivante"
        />
      </div>
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
  playForwardOutline,
} from 'ionicons/icons';
import { Chessboard } from '@/components/shared/Chessboard';
import type { BoardCore, DrawShape } from 'eg-chessboard';
import ExerciseHeader from '@/components/shared/ExerciseHeader.vue';
import SeriesCardFooter, { type CardFeedback } from '@/components/shared/SeriesCardFooter.vue';
import { useApprentissageStore } from '@/stores/apprentissage';
import { useFeedback } from '@/composables/useFeedback';
import {
  parsePartieHerosPgn,
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
          choices,
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

const initPgnStage = () => {
  const stage = etapeActuelle.value as PgnStage;
  currentPgnMoveIndex.value = -1;
  isPgnCompleted.value = !stage.moves || stage.moves.length === 0;
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

const viewPgnEnd = () => {
  const stage = etapeActuelle.value as PgnStage;
  if (!stage || stage.type !== 'pgn' || !stage.moves) return;

  if (stage.moves.length > 0) {
    currentPgnMoveIndex.value = stage.moves.length - 1;
    syncPgnBoardPosition();
  }
  isPgnCompleted.value = true;
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

const initQcmStage = () => {
  const stage = etapeActuelle.value as QcmStage;
  if (!stage || stage.type !== 'qcm') return;

  selectedChoiceIndex.value = null;
  isQcmSolved.value = false;
  qcmFeedback.value = null;
  activeQcmFen.value = stage.fen;

  if (qcmBoardApi.value) {
    qcmBoardApi.value.setPosition(stage.fen);
    qcmBoardApi.value.setShapes(stage.shapes || []);
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
  nextTick(() => {
    const stage = etapesListe.value[newIdx];
    if (!stage) return;
    if (stage.type === 'pgn') {
      initPgnStage();
    } else if (stage.type === 'qcm') {
      initQcmStage();
    }
  });
});

watch(
  () => props.config,
  () => {
    etapeCouranteIndex.value = 0;
    nextTick(() => {
      if (etapeActuelle.value.type === 'pgn') {
        initPgnStage();
      } else if (etapeActuelle.value.type === 'qcm') {
        initQcmStage();
      }
    });
  },
  { deep: true }
);

const passerEtapeSuivante = async () => {
  if (etapeCouranteIndex.value < totalEtapes.value - 1) {
    etapeCouranteIndex.value++;
  } else {
    // Dernière étape terminée
    await showSuccess('Félicitations ! Vous avez terminé ce scénario !', 3000);
    store.validerElement(props.id);
    emit('success');
  }
};
</script>

<style scoped>
.exercice-type-partie-heros {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.etape-container {
  width: 100%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stage-pgn-wrapper,
.stage-qcm-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chessboard-container {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

/* Contrôles de Navigation PGN */
.navigation-controls {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 4px;
}

.nav-btn {
  --border-radius: 50%;
  width: 44px;
  height: 44px;
}

/* Bulle de Commentaire */
.comment-container {
  width: 100%;
  background: var(--ion-color-step-100, #f4f5f8);
  border-radius: 8px;
  border-left: 4px solid var(--ion-color-primary, #3880ff);
  padding: 10px 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  min-height: 56px;
  max-height: 110px;
  overflow-y: auto;
  box-sizing: border-box;
}

.comment-text {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.35;
  color: var(--ion-color-step-800, #444);
}

.placeholder-text {
  color: var(--ion-color-step-400, #989aa2);
  font-style: italic;
}

/* Carte de Choix QCM */
.exercise-card {
  margin: 4px 0 0 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border-radius: 8px;
}

.qcm-choices {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.choice-btn {
  --border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
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

