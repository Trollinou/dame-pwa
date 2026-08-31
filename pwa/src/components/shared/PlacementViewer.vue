<template>
  <div class="placement-viewer-wrapper">
    <!-- En-tête Unifié de l'exercice avec la consigne du diagramme courant -->
    <ExerciseHeader
      :title="headerMeta.title"
      :typeLabel="headerMeta.typeLabel"
      :chapitreNiveauLabel="headerMeta.chapitreNiveauLabel"
      :consigne="consigneCourante"
      :stepBadgeText="`Carte ${indexCourant + 1} / ${diagrammesListe.length}`"
    />

    <!-- Échiquier -->
    <div class="chessboard-panel">
      <div class="chessboard-container">
        <Chessboard
          :fen="fenAffichee"
          :shapes="shapesAffichees"
          :orientation="couleurJoueur"
          :player-color="couleurJoueur"
          :view-only="true"
          @board-created="onBoardCreated"
          @square-click="verifierPlacement"
        />
      </div>
    </div>

    <!-- Footer de Navigation par Carte avec Feedback Fixe -->
    <SeriesCardFooter
      :currentCard="indexCourant + 1"
      :totalCards="diagrammesListe.length"
      :isSolved="isSolved"
      :feedback="feedback"
      @next="passerCarteSuivante"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Chessboard } from '@/components/shared/Chessboard';
import type { BoardCore, DrawShape } from 'eg-chessboard';
import {
  findBlueCircledSquare,
  findPieceOnSquare,
  removePieceFromFen,
  getActiveColorFromFen
} from '@/utils/fenUtils';
import ExerciseHeader from '@/components/shared/ExerciseHeader.vue';
import SeriesCardFooter, { type CardFeedback } from '@/components/shared/SeriesCardFooter.vue';

export interface DiagrammePopEchecs {
  consigne?: string;
  fen: string;
  couleur_joueur?: 'white' | 'black';
  shapes?: DrawShape[];
}

const props = defineProps<{
  consigne?: string;
  diagrammes?: DiagrammePopEchecs[];
  metaTitre?: string;
  metaTypeLabel?: string;
  metaChapitreNiveauLabel?: string;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const headerMeta = computed(() => {
  return {
    title: props.metaTitre || "T2 - Pop'Echecs",
    typeLabel: props.metaTypeLabel || "Pop'Echecs",
    chapitreNiveauLabel: props.metaChapitreNiveauLabel || '',
  };
});

const indexCourant = ref(0);
const isSolved = ref(false);
const boardApi = ref<BoardCore | null>(null);
const feedback = ref<CardFeedback | null>(null);

const diagrammesListe = computed<DiagrammePopEchecs[]>(() => {
  if (props.diagrammes && Array.isArray(props.diagrammes) && props.diagrammes.length > 0) {
    return props.diagrammes;
  }
  return [
    {
      consigne: props.consigne || '',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      shapes: [],
    }
  ];
});

const diagrammeCourant = computed<DiagrammePopEchecs>(() => {
  return diagrammesListe.value[indexCourant.value] || diagrammesListe.value[0];
});

const consigneCourante = computed<string>(() => {
  return diagrammeCourant.value.consigne || props.consigne || 'Placez la pièce sur la bonne case.';
});

const couleurJoueur = computed<'white' | 'black'>(() => {
  return getActiveColorFromFen(diagrammeCourant.value.fen);
});

const caseCible = computed<string | null>(() => {
  return findBlueCircledSquare(diagrammeCourant.value.shapes);
});

const pieceInfo = computed(() => {
  if (!caseCible.value) {
    return null;
  }
  return findPieceOnSquare(diagrammeCourant.value.fen, caseCible.value);
});

const fenDepart = computed<string>(() => {
  if (!caseCible.value) {
    return diagrammeCourant.value.fen;
  }
  return removePieceFromFen(diagrammeCourant.value.fen, caseCible.value);
});

const fenAffichee = computed<string>(() => {
  if (isSolved.value) {
    return diagrammeCourant.value.fen;
  }
  return fenDepart.value;
});

const shapesAffichees = computed<DrawShape[]>(() => {
  if (isSolved.value) {
    return diagrammeCourant.value.shapes || [];
  }
  return [];
});

const onBoardCreated = (api: BoardCore) => {
  boardApi.value = api;
  if (fenDepart.value) {
    api.setPosition(fenDepart.value);
  }
};

// Réinitialisation lors du changement de carte
watch(indexCourant, () => {
  isSolved.value = false;
  feedback.value = null;
  if (boardApi.value) {
    boardApi.value.setPosition(fenDepart.value);
    boardApi.value.setShapes([]);
  }
});

const verifierPlacement = async (square: string) => {
  if (isSolved.value || !caseCible.value || !pieceInfo.value) {
    return;
  }

  const squareLower = square.toLowerCase();

  // 1. Place visuellement la pièce sur la case cliquée
  boardApi.value?.putPiece(
    {
      type: pieceInfo.value.type,
      color: pieceInfo.value.color,
    },
    square
  );

  // 2. Compare la case cliquée avec la case cible
  if (squareLower === caseCible.value.toLowerCase()) {
    isSolved.value = true;
    feedback.value = {
      type: 'success',
      message: 'Parfait ! Bonne case trouvée.'
    };

    // Révéler le diagramme complet avec toutes les shapes
    if (boardApi.value) {
      boardApi.value.setPosition(diagrammeCourant.value.fen);
      if (diagrammeCourant.value.shapes) {
        boardApi.value.setShapes(diagrammeCourant.value.shapes);
      }
    }
  } else {
    // Mauvaise case
    feedback.value = {
      type: 'danger',
      message: "Ce n'est pas la bonne case ! Réessayez."
    };

    setTimeout(() => {
      boardApi.value?.removePiece(square);
      if (feedback.value?.type === 'danger') {
        feedback.value = null;
      }
    }, 800);
  }
};

const passerCarteSuivante = () => {
  feedback.value = null;
  if (indexCourant.value < diagrammesListe.value.length - 1) {
    indexCourant.value += 1;
  } else {
    emit('success');
  }
};
</script>

<style scoped>
.placement-viewer-wrapper {
  width: 100%;
}

.chessboard-panel {
  width: 100%;
  margin: 10px 0;
}


</style>

