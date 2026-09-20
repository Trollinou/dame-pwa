<template>
  <div class="exercise-stage">
    <!-- En-tête Unifié de l'exercice -->
    <ContentHeader
      :title="headerMeta.title"
      :typeLabel="headerMeta.typeLabel"
      :chapitreNiveauLabel="headerMeta.chapitreNiveauLabel"
      :consigne="consigneActuelle"
      :stepBadgeText="stepBadgeText"
    />

    <div class="etape-container">
      <!-- 1. ÉTAPE DE CHOIX INITIAL (3 Branches : 1 Principale + 2 Variantes) -->
      <div v-if="currentMode === 'initial_choice'" class="stage-qcm-wrapper animate-fade-in">
        <div class="chessboard-container">
          <Chessboard
            key="posi-initial-board"
            mode="game"
            :fen="parsedData.initialFen"
            :shapes="parsedData.initialShapes"
            :orientation="parsedData.orientation"
            :player-color="parsedData.orientation"
            :view-only="true"
            @board-created="onInitialBoardCreated"
          />
        </div>

        <div class="learning-instruction-bar">
          <span>Trouve le bon plan</span>
        </div>

        <ion-card class="exercise-card">
          <ion-card-content>
            <div class="qcm-choices">
              <ion-button
                v-for="(choix, index) in initialChoicesList"
                :key="index"
                expand="block"
                fill="solid"
                :color="couleurBoutonInitial(choix, index)"
                :disabled="isInitialChoiceSolved"
                class="choice-btn"
                @click="selectionnerChoixInitial(choix, index)"
              >
                {{ choix.label }}
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- 2. MODE EXPLORATION D'UNE VARIANTE ALTERNATIVE -->
      <div v-else-if="currentMode === 'variant_view'" class="stage-pgn-wrapper animate-fade-in">
        <!-- Bandeau d'indication de la variante -->
        <div class="variant-indicator-bar">
          <span class="variant-title">
            Variante alternative : <strong>{{ activeVariant?.label }}</strong>
          </span>
          <ion-button
            size="small"
            color="warning"
            fill="solid"
            class="return-btn"
            @click="retournerAuChoixInitial"
          >
            <ion-icon slot="start" :icon="arrowBackOutline" />
            Choix initial
          </ion-button>
        </div>

        <div class="chessboard-container">
          <Chessboard
            :key="`posi-variant-${activeVariant?.san}`"
            mode="game"
            :fen="activeVariantFen"
            :shapes="activeVariantShapes"
            :orientation="parsedData.orientation"
            :player-color="parsedData.orientation"
            :view-only="true"
            @board-created="onVariantBoardCreated"
          />
        </div>

        <!-- Contrôles de Navigation de la Variante -->
        <div class="navigation-controls">
          <ion-button
            fill="outline"
            color="primary"
            class="nav-btn"
            :disabled="currentVariantMoveIndex < 0"
            @click="viewVariantStart"
            title="Début"
          >
            <ion-icon slot="icon-only" :icon="playBackOutline" />
          </ion-button>
          <ion-button
            fill="outline"
            color="primary"
            class="nav-btn"
            :disabled="currentVariantMoveIndex < 0"
            @click="viewVariantPrevious"
            title="Précédent"
          >
            <ion-icon slot="icon-only" :icon="chevronBackOutline" />
          </ion-button>
          <ion-button
            fill="outline"
            color="primary"
            class="nav-btn"
            :disabled="isVariantAtEnd"
            @click="viewVariantNext"
            title="Suivant"
          >
            <ion-icon slot="icon-only" :icon="chevronForwardOutline" />
          </ion-button>
        </div>

        <!-- Commentaire du Coup Courant de la Variante -->
        <div ref="variantCommentContainerEl" class="comment-container" :class="{ 'comment-empty': !activeVariantComment }">
          <p class="comment-text">
            {{ activeVariantComment ? '💬 ' + activeVariantComment : '' }}
          </p>
        </div>

        <!-- Bouton retour bien visible en fin de variante -->
        <div v-if="isVariantAtEnd" class="variant-finish-action animate-fade-in">
          <ion-button
            expand="block"
            color="primary"
            @click="retournerAuChoixInitial"
          >
            <ion-icon slot="start" :icon="arrowBackOutline" />
            Retourner au choix initial
          </ion-button>
        </div>
      </div>

      <!-- 3. DÉROULEMENT DE LA BRANCHE PRINCIPALE (PGN ou QCM) -->
      <div v-else-if="currentMode === 'main_branch'" class="main-branch-wrapper animate-fade-in">
        <!-- 3.A. Sous-étape PGN (visionnage des coups) -->
        <div v-if="currentMainStage?.type === 'pgn'" class="stage-pgn-wrapper">
          <div class="chessboard-container">
            <Chessboard
              :key="`main-pgn-${mainBranchStageIndex}`"
              mode="game"
              :fen="activeMainPgnFen"
              :orientation="currentMainStage.orientation"
              :player-color="currentMainStage.orientation"
              :shapes="activeMainPgnShapes"
              :view-only="true"
              @board-created="onMainPgnBoardCreated"
            />
          </div>

          <div class="navigation-controls">
            <ion-button
              fill="outline"
              color="primary"
              class="nav-btn"
              :disabled="currentMainPgnMoveIndex < 0"
              @click="viewMainPgnStart"
              title="Début"
            >
              <ion-icon slot="icon-only" :icon="playBackOutline" />
            </ion-button>
            <ion-button
              fill="outline"
              color="primary"
              class="nav-btn"
              :disabled="currentMainPgnMoveIndex < 0"
              @click="viewMainPgnPrevious"
              title="Précédent"
            >
              <ion-icon slot="icon-only" :icon="chevronBackOutline" />
            </ion-button>
            <ion-button
              fill="outline"
              color="primary"
              class="nav-btn"
              :disabled="isMainPgnAtEnd"
              @click="viewMainPgnNext"
              title="Suivant"
            >
              <ion-icon slot="icon-only" :icon="chevronForwardOutline" />
            </ion-button>
          </div>

          <div ref="mainCommentContainerEl" class="comment-container" :class="{ 'comment-empty': !activeMainPgnComment }">
            <p class="comment-text">
              {{ activeMainPgnComment ? '💬 ' + activeMainPgnComment : '' }}
            </p>
          </div>
        </div>

        <!-- 3.B. Sous-étape QCM (choix sur la branche principale) -->
        <div v-else-if="currentMainStage?.type === 'qcm'" class="stage-qcm-wrapper">
          <div class="chessboard-container">
            <Chessboard
              :key="`main-qcm-${mainBranchStageIndex}`"
              mode="game"
              :fen="activeMainQcmFen"
              :shapes="currentMainStage.shapes"
              :orientation="currentMainStage.orientation"
              :player-color="currentMainStage.orientation"
              :view-only="true"
              @board-created="onMainQcmBoardCreated"
            />
          </div>

          <div class="qcm-instruction-bar">
            <span class="qcm-instruction-text">Trouve le coup suivant</span>
          </div>

          <ion-card class="exercise-card">
            <ion-card-content>
              <div class="qcm-choices">
                <ion-button
                  v-for="(choix, index) in currentMainStage.choices"
                  :key="index"
                  expand="block"
                  fill="solid"
                  :color="couleurBoutonMainQcm(choix, index)"
                  :disabled="isMainQcmSolved"
                  class="choice-btn"
                  @click="validerChoixMainQcm(choix, index)"
                >
                  {{ choix.label }}
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>
        </div>
      </div>

      <!-- Footer Unique de Navigation SeriesCardFooter -->
      <SeriesCardFooter
        :currentCard="footerCurrentCard"
        :totalCards="footerTotalCards"
        :isSolved="isFooterSolved"
        :feedback="footerFeedback"
        :pendingHint="footerPendingHint"
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
  arrowBackOutline,
} from 'ionicons/icons';
import { Chessboard } from '@/components/shared/Chessboard';
import type { BoardCore, DrawShape } from 'eg-chessboard';
import ContentHeader from '@/components/shared/ContentHeader.vue';
import SeriesCardFooter, { type CardFeedback } from '@/components/shared/SeriesCardFooter.vue';
import {
  parsePosiPlanPgn,
  type PosiPlanData,
  type PosiPlanVariantChoice,
  type PosiPlanQcmChoice,
  type PosiPlanPgnStage,
  type PosiPlanQcmStage,
  type PosiPlanStage,
} from '@/utils/posiPlanParser';

export interface ConfigPosiPlan {
  consigne?: string;
  pgn?: string;
  // Rétrocompatibilité ancien format JSON
  fen_depart?: string;
  couleur_joueur?: 'white' | 'black';
  etapes?: Array<{
    question: string;
    choix: Array<{ texte: string; san: string; explication: string }>;
    bonne_reponse: number;
    reponse_ordinateur?: string;
  }>;
  shapes?: DrawShape[];
  metaTitre?: string;
  metaTypeLabel?: string;
  metaChapitreNiveauLabel?: string;
}

const props = defineProps<{
  config: ConfigPosiPlan;
  id: number;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

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
  title: normalizedConfig.value.metaTitre || 'T5 - Posi\'Plan',
  typeLabel: normalizedConfig.value.metaTypeLabel || 'Posi\'Plan',
  chapitreNiveauLabel: normalizedConfig.value.metaChapitreNiveauLabel || '',
}));

const rawPgn = computed<string>(() => {
  const cfg = normalizedConfig.value;
  if (cfg.pgn && typeof cfg.pgn === 'string') {
    return cfg.pgn;
  }
  if (cfg.pgn_data && typeof cfg.pgn_data === 'string') {
    return cfg.pgn_data;
  }
  return '';
});

// Analyse du PGN Posi'Plan
const parsedData = computed<PosiPlanData>(() => {
  const cfg = normalizedConfig.value;
  if (rawPgn.value) {
    return parsePosiPlanPgn(rawPgn.value, cfg.consigne);
  }

  // Rétrocompatibilité avec l'ancien format multi-étapes FEN
  if (cfg.etapes && Array.isArray(cfg.etapes) && cfg.etapes.length > 0) {
    const defaultFen = cfg.fen_depart || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const firstEtape = cfg.etapes[0];
    const choices: PosiPlanVariantChoice[] = (firstEtape.choix || []).map((c: any, idx: number) => ({
      san: c.san || '',
      label: c.texte || c.san || `Choix ${idx + 1}`,
      isMain: idx === (firstEtape.bonne_reponse ?? 0),
      explanation: c.explication || '',
      variantMoves: [],
    }));

    const stages: PosiPlanStage[] = [];
    for (let i = 1; i < cfg.etapes.length; i++) {
      const etp = cfg.etapes[i];
      const qChoices: PosiPlanQcmChoice[] = (etp.choix || []).map((c: any, idx: number) => ({
        san: c.san || '',
        label: c.texte || c.san || `Choix ${idx + 1}`,
        isCorrect: idx === (etp.bonne_reponse ?? 0),
        explanation: c.explication || '',
      }));
      stages.push({
        type: 'qcm',
        fen: defaultFen,
        orientation: cfg.couleur_joueur || 'white',
        shapes: cfg.shapes || [],
        question: etp.question || 'Trouve le meilleur coup',
        choices: qChoices,
      });
    }

    return {
      initialFen: defaultFen,
      orientation: cfg.couleur_joueur || 'white',
      initialShapes: cfg.shapes || [],
      initialComment: '',
      initialChoices: choices,
      mainBranchStages: stages,
    };
  }

  return {
    initialFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    orientation: 'white',
    initialShapes: [],
    initialComment: '',
    initialChoices: [],
    mainBranchStages: [],
  };
});

// Navigation & États
type ModeType = 'initial_choice' | 'variant_view' | 'main_branch';
const currentMode = ref<ModeType>('initial_choice');

// ==========================================
// 1. ÉTAT DU CHOIX INITIAL
// ==========================================
const initialBoardApi = ref<BoardCore | null>(null);
const initialChoicesList = computed(() => parsedData.value.initialChoices);
const selectedInitialChoiceIndex = ref<number | null>(null);
const isInitialChoiceSolved = ref(false);
const initialFeedback = ref<CardFeedback | null>(null);

const onInitialBoardCreated = (api: BoardCore) => {
  initialBoardApi.value = api;
  if (parsedData.value.initialFen) {
    api.setPosition(parsedData.value.initialFen);
    api.setShapes(parsedData.value.initialShapes || []);
  }
};

const couleurBoutonInitial = (choix: PosiPlanVariantChoice, index: number): string => {
  if (selectedInitialChoiceIndex.value === null) {
    return 'primary';
  }
  if (isInitialChoiceSolved.value && choix.isMain) {
    return 'success';
  }
  if (selectedInitialChoiceIndex.value === index && !choix.isMain) {
    return 'warning';
  }
  return 'primary';
};

const selectionnerChoixInitial = (choix: PosiPlanVariantChoice, index: number) => {
  selectedInitialChoiceIndex.value = index;

  if (choix.isMain) {
    // Bon plan initial sélectionné
    isInitialChoiceSolved.value = true;
    initialFeedback.value = {
      type: 'success',
      message: choix.explanation || 'Bravo ! C\'est le meilleur plan.',
    };

    if (initialBoardApi.value && choix.san) {
      try {
        initialBoardApi.value.move(choix.san);
      } catch (err) {
        console.warn('Erreur coup initial sur échiquier:', err);
      }
    }
  } else {
    // Variante alternative sélectionnée -> bascule en mode exploration
    activeVariant.value = choix;
    currentVariantMoveIndex.value = 0;
    currentMode.value = 'variant_view';
    nextTick(() => {
      syncVariantBoardPosition();
    });
  }
};

// ==========================================
// 2. ÉTAT D'EXPLORATION DE LA VARIANTE
// ==========================================
const variantBoardApi = ref<BoardCore | null>(null);
const activeVariant = ref<PosiPlanVariantChoice | null>(null);
const currentVariantMoveIndex = ref(0);
const variantCommentContainerEl = ref<HTMLElement | null>(null);

const activeVariantFen = computed<string>(() => {
  if (!activeVariant.value || !activeVariant.value.variantMoves) {
    return parsedData.value.initialFen;
  }
  if (currentVariantMoveIndex.value < 0 || !activeVariant.value.variantMoves[currentVariantMoveIndex.value]) {
    return parsedData.value.initialFen;
  }
  return activeVariant.value.variantMoves[currentVariantMoveIndex.value].fenAfter;
});

const activeVariantShapes = computed<DrawShape[]>(() => {
  if (!activeVariant.value || !activeVariant.value.variantMoves) {
    return [];
  }
  if (currentVariantMoveIndex.value < 0) {
    return activeVariant.value.startingShapes || [];
  }
  const move = activeVariant.value.variantMoves[currentVariantMoveIndex.value];
  return move?.shapes || [];
});

const activeVariantComment = computed<string>(() => {
  if (!activeVariant.value || !activeVariant.value.variantMoves) {
    return '';
  }
  if (currentVariantMoveIndex.value < 0) {
    return activeVariant.value.explanation || '';
  }
  const move = activeVariant.value.variantMoves[currentVariantMoveIndex.value];
  return move?.comment || activeVariant.value.explanation || '';
});

const isVariantAtEnd = computed<boolean>(() => {
  if (!activeVariant.value || !activeVariant.value.variantMoves) {
    return true;
  }
  return currentVariantMoveIndex.value >= activeVariant.value.variantMoves.length - 1;
});

const syncVariantBoardPosition = () => {
  if (!variantBoardApi.value) return;
  variantBoardApi.value.setPosition(activeVariantFen.value);
  variantBoardApi.value.setShapes(activeVariantShapes.value);
  if (typeof variantBoardApi.value.redraw === 'function') {
    variantBoardApi.value.redraw(true);
  }
};

const onVariantBoardCreated = (api: BoardCore) => {
  variantBoardApi.value = api;
  syncVariantBoardPosition();
};

const viewVariantStart = () => {
  currentVariantMoveIndex.value = 0;
  syncVariantBoardPosition();
};

const viewVariantPrevious = () => {
  if (currentVariantMoveIndex.value > 0) {
    currentVariantMoveIndex.value--;
    syncVariantBoardPosition();
  }
};

const viewVariantNext = () => {
  if (!activeVariant.value?.variantMoves) return;
  if (currentVariantMoveIndex.value < activeVariant.value.variantMoves.length - 1) {
    currentVariantMoveIndex.value++;
    syncVariantBoardPosition();
  }
};

const retournerAuChoixInitial = () => {
  currentMode.value = 'initial_choice';
  selectedInitialChoiceIndex.value = null;
  activeVariant.value = null;
  nextTick(() => {
    if (initialBoardApi.value) {
      initialBoardApi.value.setPosition(parsedData.value.initialFen);
      initialBoardApi.value.setShapes(parsedData.value.initialShapes || []);
      if (typeof initialBoardApi.value.redraw === 'function') {
        initialBoardApi.value.redraw(true);
      }
    }
  });
};

// ==========================================
// 3. ÉTAT DE LA BRANCHE PRINCIPALE
// ==========================================
const mainBranchStageIndex = ref(0);
const mainBranchFeedback = ref<CardFeedback | null>(null);

const currentMainStage = computed<PosiPlanStage | null>(() => {
  return parsedData.value.mainBranchStages[mainBranchStageIndex.value] || null;
});

// 3.A. PGN Main Stage
const mainPgnBoardApi = ref<BoardCore | null>(null);
const currentMainPgnMoveIndex = ref(-1);
const isMainPgnCompleted = ref(false);
const mainCommentContainerEl = ref<HTMLElement | null>(null);

const isMainPgnAtEnd = computed<boolean>(() => {
  const stage = currentMainStage.value as PosiPlanPgnStage;
  if (!stage || stage.type !== 'pgn' || !stage.moves) {
    return true;
  }
  return currentMainPgnMoveIndex.value >= stage.moves.length - 1;
});

const activeMainPgnFen = computed<string>(() => {
  const stage = currentMainStage.value as PosiPlanPgnStage;
  if (!stage || stage.type !== 'pgn') {
    return parsedData.value.initialFen;
  }
  if (currentMainPgnMoveIndex.value < 0 || !stage.moves[currentMainPgnMoveIndex.value]) {
    return stage.fenDepart;
  }
  return stage.moves[currentMainPgnMoveIndex.value].fenAfter;
});

const activeMainPgnShapes = computed<DrawShape[]>(() => {
  const stage = currentMainStage.value as PosiPlanPgnStage;
  if (!stage || stage.type !== 'pgn') {
    return [];
  }
  if (currentMainPgnMoveIndex.value < 0) {
    return stage.startingShapes || [];
  }
  const move = stage.moves[currentMainPgnMoveIndex.value];
  return move?.shapes || [];
});

const activeMainPgnComment = computed<string>(() => {
  const stage = currentMainStage.value as PosiPlanPgnStage;
  if (!stage || stage.type !== 'pgn') {
    return '';
  }
  if (currentMainPgnMoveIndex.value < 0) {
    return stage.startingComment || '';
  }
  const move = stage.moves[currentMainPgnMoveIndex.value];
  return move?.comment || '';
});

const syncMainPgnBoardPosition = () => {
  if (!mainPgnBoardApi.value) return;
  mainPgnBoardApi.value.setPosition(activeMainPgnFen.value);
  mainPgnBoardApi.value.setShapes(activeMainPgnShapes.value);
  if (typeof mainPgnBoardApi.value.redraw === 'function') {
    mainPgnBoardApi.value.redraw(true);
  }
};

const onMainPgnBoardCreated = (api: BoardCore) => {
  mainPgnBoardApi.value = api;
  syncMainPgnBoardPosition();
};

const viewMainPgnStart = () => {
  currentMainPgnMoveIndex.value = -1;
  syncMainPgnBoardPosition();
};

const viewMainPgnPrevious = () => {
  if (currentMainPgnMoveIndex.value > -1) {
    currentMainPgnMoveIndex.value--;
    syncMainPgnBoardPosition();
  }
};

const viewMainPgnNext = () => {
  const stage = currentMainStage.value as PosiPlanPgnStage;
  if (!stage || stage.type !== 'pgn' || !stage.moves) return;

  if (currentMainPgnMoveIndex.value < stage.moves.length - 1) {
    currentMainPgnMoveIndex.value++;
    syncMainPgnBoardPosition();
    if (currentMainPgnMoveIndex.value === stage.moves.length - 1) {
      isMainPgnCompleted.value = true;
    }
  }
};

// 3.B. QCM Main Stage
const mainQcmBoardApi = ref<BoardCore | null>(null);
const selectedMainQcmChoiceIndex = ref<number | null>(null);
const isMainQcmSolved = ref(false);
const activeMainQcmFen = ref('');

const onMainQcmBoardCreated = (api: BoardCore) => {
  mainQcmBoardApi.value = api;
  const stage = currentMainStage.value as PosiPlanQcmStage;
  if (stage && stage.type === 'qcm') {
    api.setPosition(stage.fen);
    api.setShapes(stage.shapes || []);
  }
};

const couleurBoutonMainQcm = (choix: PosiPlanQcmChoice, index: number): string => {
  if (selectedMainQcmChoiceIndex.value === null) {
    return 'primary';
  }
  if (choix.isCorrect && isMainQcmSolved.value) {
    return 'success';
  }
  if (index === selectedMainQcmChoiceIndex.value && !choix.isCorrect) {
    return 'danger';
  }
  return 'primary';
};

const validerChoixMainQcm = (choix: PosiPlanQcmChoice, index: number) => {
  if (isMainQcmSolved.value) return;

  selectedMainQcmChoiceIndex.value = index;

  if (choix.isCorrect) {
    isMainQcmSolved.value = true;
    mainBranchFeedback.value = {
      type: 'success',
      message: choix.explanation || 'Bravo ! C\'est le meilleur coup.',
    };

    if (mainQcmBoardApi.value) {
      try {
        mainQcmBoardApi.value.move(choix.san);
      } catch (err) {
        console.warn('Erreur coup QCM sur échiquier:', err);
      }
    }
  } else {
    mainBranchFeedback.value = {
      type: 'danger',
      message: choix.explanation || 'Ce n\'est pas le bon coup ! Réessayez.',
    };
  }
};

const resetMainStageState = (stage?: PosiPlanStage | null) => {
  const current = stage || currentMainStage.value;
  if (!current) return;

  mainBranchFeedback.value = null;
  if (current.type === 'pgn') {
    currentMainPgnMoveIndex.value = -1;
    isMainPgnCompleted.value = !current.moves || current.moves.length === 0;
  } else if (current.type === 'qcm') {
    selectedMainQcmChoiceIndex.value = null;
    isMainQcmSolved.value = false;
    activeMainQcmFen.value = current.fen;
  }
};

watch(mainBranchStageIndex, () => {
  resetMainStageState();
  nextTick(() => {
    if (currentMainStage.value?.type === 'pgn') {
      syncMainPgnBoardPosition();
    } else if (currentMainStage.value?.type === 'qcm' && mainQcmBoardApi.value) {
      mainQcmBoardApi.value.setPosition(currentMainStage.value.fen);
      mainQcmBoardApi.value.setShapes(currentMainStage.value.shapes || []);
      if (typeof mainQcmBoardApi.value.redraw === 'function') {
        mainQcmBoardApi.value.redraw(true);
      }
    }
  });
});

// ==========================================
// 4. SYNCHRONISATION CONTENT HEADER & SERIES CARD FOOTER
// ==========================================
const totalMainStages = computed(() => parsedData.value.mainBranchStages.length);
const footerTotalCards = computed(() => 1 + totalMainStages.value);

const footerCurrentCard = computed<number>(() => {
  if (currentMode.value === 'initial_choice' || currentMode.value === 'variant_view') {
    return 1;
  }
  return mainBranchStageIndex.value + 2;
});

const stepBadgeText = computed<string>(() => {
  if (currentMode.value === 'variant_view') {
    return 'Variante';
  }
  return `Étape ${footerCurrentCard.value} / ${footerTotalCards.value}`;
});

const consigneActuelle = computed<string>(() => {
  if (currentMode.value === 'variant_view') {
    return activeVariant.value?.label ? `Variante alternative : ${activeVariant.value.label}` : 'Variante alternative';
  }
  if (currentMode.value === 'main_branch') {
    if (currentMainStage.value?.type === 'qcm') {
      return currentMainStage.value.question || 'Trouve le coup suivant';
    }
    return 'Visionnez les coups pour continuer le plan.';
  }
  return props.config?.consigne || 'Évaluez la position et choisissez le meilleur plan.';
});

const isFooterSolved = computed<boolean>(() => {
  if (currentMode.value === 'initial_choice') {
    return isInitialChoiceSolved.value;
  }
  if (currentMode.value === 'variant_view') {
    return false;
  }
  if (currentMode.value === 'main_branch') {
    if (currentMainStage.value?.type === 'pgn') {
      return isMainPgnCompleted.value;
    }
    if (currentMainStage.value?.type === 'qcm') {
      return isMainQcmSolved.value;
    }
  }
  return false;
});

const footerFeedback = computed<CardFeedback | null>(() => {
  if (currentMode.value === 'initial_choice') {
    return initialFeedback.value;
  }
  if (currentMode.value === 'variant_view') {
    return null;
  }
  return mainBranchFeedback.value;
});

const footerPendingHint = computed<string>(() => {
  if (currentMode.value === 'initial_choice') {
    return 'Trouvez le bon plan pour continuer';
  }
  if (currentMode.value === 'variant_view') {
    return 'Explorez la variante ou retournez au choix initial';
  }
  if (currentMode.value === 'main_branch') {
    if (currentMainStage.value?.type === 'qcm') {
      return 'Trouvez le meilleur coup pour continuer';
    }
    return 'Visionnez tous les coups pour continuer';
  }
  return '';
});

// Émission du succès si l'exercice complet est terminé
watch(
  () => isFooterSolved.value,
  (solved) => {
    if (
      solved &&
      currentMode.value === 'main_branch' &&
      mainBranchStageIndex.value >= totalMainStages.value - 1
    ) {
      emit('success');
    }
  },
  { immediate: true }
);

const passerEtapeSuivante = () => {
  if (currentMode.value === 'initial_choice') {
    if (totalMainStages.value > 0) {
      currentMode.value = 'main_branch';
      mainBranchStageIndex.value = 0;
      resetMainStageState(parsedData.value.mainBranchStages[0]);
    } else {
      emit('success');
    }
  } else if (currentMode.value === 'main_branch') {
    if (mainBranchStageIndex.value < totalMainStages.value - 1) {
      mainBranchStageIndex.value++;
    } else {
      emit('success');
    }
  }
};
</script>

<style scoped>
.etape-container {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  gap: 8px;
}

.stage-pgn-wrapper,
.stage-qcm-wrapper,
.main-branch-wrapper {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  gap: 6px;
}

/* Bandeau Variante */
.variant-indicator-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--ion-color-warning-tint, #fff3cd);
  border: 1px solid var(--ion-color-warning, #ffc409);
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 0.88rem;
  color: var(--ion-color-warning-shade, #856404);
}

.variant-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.return-btn {
  --border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  margin: 0;
  height: 28px;
}

.variant-finish-action {
  margin-top: 8px;
}
</style>
