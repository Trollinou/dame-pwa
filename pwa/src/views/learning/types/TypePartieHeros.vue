<template>
  <div class="exercice-type-partie-heros">
    <div class="etape-container">
      <!-- 1. Étape de Défilement / Visionnage PGN -->
      <div v-if="etapeActuelle.type === 'pgn'" class="stage-pgn-wrapper pgn-layout pgn-layout--with-comments animate-fade-in">
        <div class="pgn-board-column">
          <div class="chessboard-container">
            <Chessboard
              :key="`pgn-${etapeCouranteIndex}`"
              mode="game"
              :fen="activePgnFen"
              :last-move="activePgnLastMove"
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
        </div>

        <div class="pgn-comment-panel">
          <!-- Affichage du Commentaire du Coup Courant (hauteur constante réservée pour éviter les sauts d'interface) -->
          <div ref="commentContainerEl" class="comment-container" :class="{ 'comment-empty': !activePgnComment }">
            <p class="comment-text">
              {{ activePgnComment ? '💬 ' + activePgnComment : '' }}
            </p>
          </div>
        </div>
      </div>

      <!-- 2. Étape de Choix Interactif sur l'Échiquier -->
      <div v-else-if="etapeActuelle.type === 'qcm'" class="stage-qcm-wrapper animate-fade-in">
        <div class="chessboard-container">
          <Chessboard
            :key="`qcm-${etapeCouranteIndex}`"
            mode="game"
            :fen="activeQcmFen"
            :last-move="activeQcmLastMove"
            :shapes="etapeActuelle.shapes"
            :orientation="etapeActuelle.orientation"
            :player-color="etapeActuelle.orientation"
            :view-only="isQcmSolved"
            @board-created="onQcmBoardCreated"
            @move="handleQcmBoardMove"
          />
        </div>
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
  IonButton,
  IonIcon,
} from '@ionic/vue';
import {
  playBackOutline,
  chevronBackOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { Chessboard } from '@/components/shared/Chessboard';
import type { BoardCore, DrawShape, Key, Move } from 'eg-chessboard';
import { useExerciseHeader } from '@/composables/learning/useExerciseHeader';
import SeriesCardFooter, { type CardFeedback } from '@/components/learning/SeriesCardFooter.vue';
import { useApprentissageStore } from '@/stores/apprentissage';
import {
  parsePartieHerosPgn,
  shuffleChoices,
  type PartieHerosStage,
  type PgnStage,
  type QcmStage,
} from '@/utils/parsers/partieHerosParser';
import type { ExerciseType4Config } from '@/types/roi';

const props = defineProps<{
  config: ExerciseType4Config;
  id: number;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const store = useApprentissageStore();

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

const DEFAULT_CONSIGNE = 'Joue comme un champion !';

const exerciseHeader = useExerciseHeader();
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
          question: item.question || DEFAULT_CONSIGNE,
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
    return etapeActuelle.value.question || props.config?.consigne || DEFAULT_CONSIGNE;
  }
  return props.config?.consigne || DEFAULT_CONSIGNE;
});

watch(
  [consigneActuelle, etapeCouranteIndex, totalEtapes],
  ([consigne, idx, total]) => {
    exerciseHeader?.setHeaderState({
      consigne,
      stepBadgeText: `Étape ${idx + 1} / ${total}`,
    });
  },
  { immediate: true }
);

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

const activePgnLastMove = computed<Key[] | undefined>(() => {
  const stage = etapeActuelle.value as PgnStage;
  if (!stage || stage.type !== 'pgn') {
    return undefined;
  }
  if (currentPgnMoveIndex.value < 0) {
    return stage.startingLastMove;
  }
  return stage.moves[currentPgnMoveIndex.value]?.lastMove;
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

const commentContainerEl = ref<HTMLElement | null>(null);

watch(activePgnComment, () => {
  nextTick(() => {
    if (commentContainerEl.value) {
      commentContainerEl.value.scrollTop = 0;
    }
  });
});

const syncPgnBoardPosition = () => {
  if (!pgnBoardApi.value) return;
  const stage = etapeActuelle.value as PgnStage;
  if (!stage || stage.type !== 'pgn') return;

  const targetFen = activePgnFen.value;
  const targetShapes = activePgnShapes.value;

  pgnBoardApi.value.setPosition(targetFen, activePgnLastMove.value);
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
    isQcmSolved.value = false;
    qcmFeedback.value = null;
  } else if (current.type === 'qcm') {
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
const isQcmSolved = ref(false);
const qcmFeedback = ref<CardFeedback | null>(null);
const activeQcmFen = ref('');

const activeQcmLastMove = computed<Key[] | undefined>(() => {
  const stage = etapeActuelle.value as QcmStage;
  if (!stage || stage.type !== 'qcm') {
    return undefined;
  }
  return stage.lastMove;
});

const onQcmBoardCreated = (api: BoardCore) => {
  qcmBoardApi.value = api;
  initQcmStage();
};

const initQcmStage = (stage?: QcmStage) => {
  const current = stage || (etapeActuelle.value as QcmStage);
  if (!current || current.type !== 'qcm') return;

  isQcmSolved.value = false;
  qcmFeedback.value = null;
  activeQcmFen.value = current.fen;
  currentPgnMoveIndex.value = -1;
  isPgnCompleted.value = false;

  if (qcmBoardApi.value) {
    qcmBoardApi.value.setPosition(current.fen, current.lastMove);
    qcmBoardApi.value.setShapes(current.shapes || []);
    if (typeof qcmBoardApi.value.redraw === 'function') {
      qcmBoardApi.value.redraw(true);
    }
  }
};

const handleQcmBoardMove = (move: Move) => {
  if (isQcmSolved.value) {
    return;
  }

  const stage = etapeActuelle.value as QcmStage;
  if (!stage || stage.type !== 'qcm') {
    return;
  }

  const moveSanClean = (move.san || '').replace(/[+#x=]/g, '').trim();
  const matchedChoice = stage.choices?.find(
    (c) => c.san && c.san.replace(/[+#x=]/g, '').trim() === moveSanClean
  );

  if (matchedChoice) {
    if (matchedChoice.isCorrect) {
      isQcmSolved.value = true;
      qcmFeedback.value = {
        type: 'success',
        message: matchedChoice.explanation || 'Bravo ! C\'est le meilleur coup.',
      };
    } else {
      qcmFeedback.value = {
        type: 'danger',
        message: matchedChoice.explanation || 'Ce n\'est pas le bon coup ! Réessaie.',
      };
      setTimeout(() => {
        if (qcmBoardApi.value && !isQcmSolved.value && etapeActuelle.value.type === 'qcm') {
          qcmBoardApi.value.setPosition(stage.fen, stage.lastMove);
          qcmBoardApi.value.setShapes(stage.shapes || []);
          if (typeof qcmBoardApi.value.redraw === 'function') {
            qcmBoardApi.value.redraw(true);
          }
        }
      }, 1200);
    }
  } else {
    qcmFeedback.value = {
      type: 'warning',
      message: 'Observe bien les flèches sur l’échiquier et joue l’un des coups proposés.',
    };
    setTimeout(() => {
      if (qcmBoardApi.value && !isQcmSolved.value && etapeActuelle.value.type === 'qcm') {
        qcmBoardApi.value.setPosition(stage.fen, stage.lastMove);
        qcmBoardApi.value.setShapes(stage.shapes || []);
        if (typeof qcmBoardApi.value.redraw === 'function') {
          qcmBoardApi.value.redraw(true);
        }
      }
    }, 800);
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
        qcmBoardApi.value.setPosition(stage.fen, stage.lastMove);
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
          qcmBoardApi.value.setPosition(stage.fen, stage.lastMove);
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
    return 'Trouve le meilleur coup pour continuer';
  }
  return 'Visionne tous les coups pour continuer';
});

watch(
  () => isCurrentStageSolved.value,
  (solved) => {
    if (solved && etapeCouranteIndex.value >= totalEtapes.value - 1) {
      emit('success');
    }
  },
  { immediate: true }
);

const passerEtapeSuivante = () => {
  if (etapeCouranteIndex.value < totalEtapes.value - 1) {
    etapeCouranteIndex.value++;
  } else {
    emit('success');
  }
};
</script>
