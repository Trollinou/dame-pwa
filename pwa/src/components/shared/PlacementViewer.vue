<template>
  <div class="placement-viewer-layout">
    <ion-card v-if="consigne" class="consigne-card">
      <ion-card-header>
        <ion-card-title class="consigne-title">{{ consigne }}</ion-card-title>
      </ion-card-header>
    </ion-card>

    <div class="board-container">
      <Chessboard
        :fen="fenDepart"
        :view-only="true"
        @board-created="onBoardCreated"
        @square-click="verifierPlacement"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { IonCard, IonCardHeader, IonCardTitle } from '@ionic/vue';
import { Chessboard } from '@/components/shared/Chessboard';
import { useFeedback } from '@/composables/useFeedback';
import type { BoardCore } from 'eg-chessboard';

const { showSuccess, showError } = useFeedback();

const props = defineProps<{
  consigne?: string;
  fenDepart: string;
  pieceType: 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
  pieceColor: 'white' | 'black' | 'w' | 'b' | string;
  caseCible: string;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const boardApi = ref<BoardCore | null>(null);
const aTrouve = ref(false);

const onBoardCreated = (api: BoardCore) => {
  boardApi.value = api;
  if (props.fenDepart) {
    api.setPosition(props.fenDepart);
  }
};

watch(
  () => props.fenDepart,
  (newFen) => {
    if (boardApi.value && newFen) {
      boardApi.value.setPosition(newFen);
      aTrouve.value = false;
    }
  }
);

const verifierPlacement = async (square: string) => {
  if (aTrouve.value) {
    return;
  }

  // Conversion de la couleur pour eg-chessboard (w ou b)
  const colorShort = props.pieceColor === 'white' ? 'w' : (props.pieceColor === 'black' ? 'b' : props.pieceColor);

  // 1. Place visuellement la pièce sur la case cliquée
  boardApi.value?.putPiece(
    { 
      type: props.pieceType as 'p' | 'r' | 'n' | 'b' | 'q' | 'k', 
      color: colorShort as 'w' | 'b' 
    },
    square
  );

  // 2. Compare la case cliquée avec la case cible (en ignorant la casse)
  if (square.toLowerCase() === props.caseCible.toLowerCase()) {
    aTrouve.value = true;
    
    // 3. Bonne case : Toast vert et émission du succès
    await showSuccess('Parfait !', 3000);
    
    // Petit délai avant de passer à la suite pour apprécier le placement
    setTimeout(() => {
      emit('success');
    }, 1000);
    
  } else {
    // 4. Mauvaise case : Toast rouge et retrait de la pièce erronée après 800ms
    await showError("Ce n'est pas la bonne case !", 2000);

    setTimeout(() => {
      boardApi.value?.removePiece(square);
    }, 800);
  }
};
</script>

<style scoped>
.placement-viewer-layout {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.consigne-card {
  width: 100%;
  max-width: 500px;
  margin-bottom: 16px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.consigne-title {
  font-size: 1.1rem;
  line-height: 1.4;
  text-align: center;
}

.board-container {
  width: 100%;
  aspect-ratio: 1;
  max-width: 500px;
  margin: 0 auto;
  border-radius: 0;
  overflow: hidden;
  box-shadow: none;
}
</style>
