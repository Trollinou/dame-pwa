<template>
  <div class="matching-container">
    <div class="matching-rows-list">
      <div
        v-for="(paire, index) in paires"
        :key="index"
        class="matching-row"
      >
        <!-- Échiquier (Gauche, mélangé) -->
        <div class="board-column">
          <div
            v-if="echiquiersMelanges[index]"
            class="board-wrapper-card"
            :class="{
              'selected': selectionEchiquier === index,
              'linked': liaisons[index] !== undefined,
              'correct-locked': boardsCorrects.includes(index)
            }"
            :style="getBoardStyle(index)"
            @click="selectBoard(index)"
          >
            <div class="board-header-bar">
              <span class="board-num">
                Échiquier {{ index + 1 }}
              </span>
              <span
                v-if="liaisons[index] !== undefined"
                class="link-indicator"
                :style="{
                  'background-color': colors[liaisons[index]].badgeBg,
                  'color': colors[liaisons[index]].text,
                  'border': `1px solid ${colors[liaisons[index]].border}`
                }"
              >
                <span v-if="boardsCorrects.includes(index)">✓ </span>Option {{ getLetter(liaisons[index]) }}
              </span>
              <span
                v-else-if="selectionEchiquier === index"
                class="selection-dot"
                title="Échiquier sélectionné"
              ></span>
            </div>
            <div class="chessboard-container--mini">
              <Chessboard
                :fen="echiquiersMelanges[index].fen"
                :player-color="echiquiersMelanges[index].couleur_joueur"
                :orientation="echiquiersMelanges[index].couleur_joueur"
                :shapes="echiquiersMelanges[index].shapes || []"
                :view-only="true"
                :coordinates="false"
                :zoomable="true"
              />
            </div>
          </div>
        </div>

        <!-- Description (Droite, fixe dans l'ordre d'origine) -->
        <div class="desc-column">
          <ion-card
            class="description-card"
            :class="{
              'linked': isDescLinked(index),
              'correct-locked': isDescLocked(index),
              'active-for-selection': selectionEchiquier !== null && !isDescLinked(index) && !isDescLocked(index)
            }"
            :style="{
              'border-color': colors[index].border,
              'background-color': isDescLinked(index) || isDescLocked(index) ? colors[index].bg : 'var(--ion-color-step-50, #fcfcfc)'
            }"
            @click="linkDescription(index)"
          >
            <ion-card-content class="desc-card-content">
              <div
                class="desc-letter-badge"
                :style="{
                  'background-color': colors[index].badgeBg,
                  'color': colors[index].text,
                  'border': `1px solid ${colors[index].border}`
                }"
              >
                Option {{ getLetter(index) }}
              </div>
              <div class="desc-text-content">
                {{ paire.description }}
              </div>
              <div v-if="isDescLocked(index)" class="desc-link-badge" :style="{ 'color': colors[index].border }">
                ✓ Correct (Échiquier {{ getLinkedBoardIndex(index)! + 1 }})
              </div>
              <div v-else-if="getLinkedBoardIndex(index) !== null" class="desc-link-badge" :style="{ 'color': colors[index].border }">
                Associé à l'Échiquier {{ getLinkedBoardIndex(index)! + 1 }}
              </div>
            </ion-card-content>
          </ion-card>
        </div>
      </div>
    </div>

    <!-- Bouton de Validation -->
    <div v-if="toutesLiaisonsFaites" class="validation-container">
      <ion-button
        expand="block"
        color="success"
        class="validate-btn"
        @click="validerAssociations"
      >
        Valider mes choix
      </ion-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import {
  IonCard,
  IonCardContent,
  IonButton
} from '@ionic/vue';
import { Chessboard } from '@/components/shared/Chessboard';
import type { DrawShape } from 'eg-chessboard';
import { shuffleArray } from '@/utils/chessNotation';

export interface MatchingFeedback {
  type: 'success' | 'danger' | 'warning' | 'info';
  message: string;
}

interface Paire {
  fen: string;
  couleur_joueur: 'white' | 'black';
  description: string;
  shapes?: DrawShape[];
}

interface EchiquierMelange {
  fen: string;
  couleur_joueur: 'white' | 'black';
  originalIndex: number;
  shapes?: DrawShape[];
}

const props = defineProps<{
  paires: Paire[];
}>();

const emit = defineEmits<{
  (e: 'success'): void;
  (e: 'feedback', feedback: MatchingFeedback | null): void;
}>();

// Palette de couleurs premium pour différencier les descriptions
const colors = [
  { name: 'blue', border: '#3880ff', bg: 'rgba(56, 128, 255, 0.04)', text: '#3880ff', badgeBg: 'rgba(56, 128, 255, 0.1)' },
  { name: 'purple', border: '#af47ff', bg: 'rgba(175, 71, 255, 0.04)', text: '#af47ff', badgeBg: 'rgba(175, 71, 255, 0.1)' },
  { name: 'orange', border: '#e67e22', bg: 'rgba(230, 126, 34, 0.04)', text: '#e67e22', badgeBg: 'rgba(230, 126, 34, 0.1)' },
  { name: 'pink', border: '#ff375f', bg: 'rgba(255, 55, 95, 0.04)', text: '#ff375f', badgeBg: 'rgba(255, 55, 95, 0.1)' }
];

const echiquiersMelanges = ref<EchiquierMelange[]>([]);
const selectionEchiquier = ref<number | null>(null);
const liaisons = ref<Record<number, number>>({});
const boardsCorrects = ref<number[]>([]);

const getBoardStyle = (boardIdx: number) => {
  const descIdx = liaisons.value[boardIdx];
  if (descIdx !== undefined) {
    const color = colors[descIdx];
    return {
      'border-color': color.border,
      'background-color': color.bg
    };
  }
  return {};
};

// Initialise et mélange les échiquiers
const initEchiquiers = () => {
  if (!props.paires || props.paires.length === 0) return;

  const items = props.paires.map((p, idx) => ({
    fen: p.fen,
    couleur_joueur: p.couleur_joueur,
    shapes: p.shapes || [],
    originalIndex: idx
  }));

  echiquiersMelanges.value = shuffleArray(items);
  liaisons.value = {};
  selectionEchiquier.value = null;
  boardsCorrects.value = [];
};

onMounted(() => {
  initEchiquiers();
});

watch(() => props.paires, () => {
  initEchiquiers();
}, { deep: true });

// Aide pour obtenir les lettres A, B, C, D
const getLetter = (index: number): string => {
  return String.fromCharCode(65 + index); // 65 est 'A'
};

const selectBoard = (index: number) => {
  if (boardsCorrects.value.includes(index)) return;
  emit('feedback', null);
  selectionEchiquier.value = selectionEchiquier.value === index ? null : index;
};

const linkDescription = (descIdx: number) => {
  if (selectionEchiquier.value === null || isDescLocked(descIdx)) {
    return;
  }

  emit('feedback', null);
  const boardIdx = selectionEchiquier.value;

  // Supprime l'ancienne liaison si cette description était déjà liée à un autre échiquier
  for (const key in liaisons.value) {
    if (liaisons.value[Number(key)] === descIdx) {
      delete liaisons.value[Number(key)];
    }
  }

  // Crée la nouvelle liaison
  liaisons.value[boardIdx] = descIdx;

  // Sélection automatique du prochain échiquier non lié et non validé
  const nextUnlinked = [0, 1, 2, 3].find(
    (idx) => idx !== boardIdx && liaisons.value[idx] === undefined && !boardsCorrects.value.includes(idx)
  );
  selectionEchiquier.value = nextUnlinked !== undefined ? nextUnlinked : null;
};

const getLinkedBoardIndex = (descIdx: number): number | null => {
  const boardKey = Object.keys(liaisons.value).find(
    (key) => liaisons.value[Number(key)] === descIdx
  );
  return boardKey !== undefined ? Number(boardKey) : null;
};

const isDescLinked = (descIdx: number): boolean => {
  return getLinkedBoardIndex(descIdx) !== null;
};

const isDescLocked = (descIdx: number): boolean => {
  const boardIdx = getLinkedBoardIndex(descIdx);
  return boardIdx !== null && boardsCorrects.value.includes(boardIdx);
};

const toutesLiaisonsFaites = computed(() => {
  return Object.keys(liaisons.value).length === props.paires.length && props.paires.length > 0;
});

const validerAssociations = () => {
  let errorsCount = 0;
  const newlyCorrect: number[] = [];

  for (let i = 0; i < props.paires.length; i++) {
    if (boardsCorrects.value.includes(i)) continue;

    const linkedDescIdx = liaisons.value[i];
    if (
      linkedDescIdx === undefined ||
      echiquiersMelanges.value[i].originalIndex !== linkedDescIdx
    ) {
      errorsCount++;
      // Supprime l'association erronée pour permettre de la corriger
      delete liaisons.value[i];
    } else {
      newlyCorrect.push(i);
    }
  }

  boardsCorrects.value.push(...newlyCorrect);

  if (errorsCount > 0) {
    emit('feedback', {
      type: 'danger',
      message: 'Certaines associations sont incorrectes, réessayez !',
    });
    // Reprendre la sélection sur le premier échiquier vide et non correct
    const firstEmpty = [0, 1, 2, 3].find(
      (idx) => liaisons.value[idx] === undefined && !boardsCorrects.value.includes(idx)
    );
    if (firstEmpty !== undefined) {
      selectionEchiquier.value = firstEmpty;
    }
  } else {
    emit('feedback', {
      type: 'success',
      message: 'Bravo ! Toutes les correspondances sont trouvées.',
    });
    emit('success');
  }
};
</script>
