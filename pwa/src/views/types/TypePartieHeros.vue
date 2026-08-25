<template>
  <div class="exercice-type-partie-heros">
    <ExerciseHeader
      :title="headerMeta.title"
      :typeLabel="headerMeta.typeLabel"
      :chapitreNiveauLabel="headerMeta.chapitreNiveauLabel"
      :consigne="etapeActuelle.question || 'Revivez la partie du héros et trouvez le bon coup.'"
      :stepBadgeText="`Étape ${etapeCouranteIndex + 1} / ${props.config?.etapes?.length || 1}`"
    />

    <div class="etape-container">
      
      <PgnViewer 
        v-if="etapeActuelle.type === 'pgn'"
        :key="'pgn-' + etapeCouranteIndex"
        :pgnString="etapeActuelle.pgn_data || ''"
        :autoCompleteDelay="estDerniereEtape ? 1200 : 0"
        :currentCard="etapeCouranteIndex + 1"
        :totalCards="props.config?.etapes?.length || 1"
        @finished="transitionToNextStage"
      />

      <QcmViewer 
        v-else-if="etapeActuelle.type === 'qcm'"
        :key="'qcm-' + etapeCouranteIndex"
        :fen="etapeActuelle.fen || ''"
        :question="etapeActuelle.question || ''"
        :hideQuestion="true"
        :choix="etapeActuelle.choix || []"
        :bonneReponse="etapeActuelle.bonne_reponse || 0"
        :shapes="etapeActuelle.shapes"
        :currentCard="etapeCouranteIndex + 1"
        :totalCards="props.config?.etapes?.length || 1"
        @success="transitionToNextStage"
      />

      <PuzzleViewer
        v-else-if="etapeActuelle.type === 'puzzle' || etapeActuelle.type === 'move'"
        :key="'puzzle-' + etapeCouranteIndex"
        :fen="etapeActuelle.fen || etapeActuelle.fenDepart || ''"
        :couleurJoueur="etapeActuelle.couleur_joueur || etapeActuelle.couleurJoueur || 'white'"
        :solution="Array.isArray(etapeActuelle.solution) ? etapeActuelle.solution : [etapeActuelle.solution || etapeActuelle.coup || '']"
        :shapes="etapeActuelle.shapes"
        @success="transitionToNextStage"
      />

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useApprentissageStore } from '@/stores/apprentissage';
import { useFeedback } from '@/composables/useFeedback';
import ExerciseHeader from '@/components/shared/ExerciseHeader.vue';
import PgnViewer from '@/components/shared/PgnViewer.vue';
import QcmViewer from '@/components/shared/QcmViewer.vue';
import PuzzleViewer from '@/components/shared/PuzzleViewer.vue';
import type { DrawShape } from 'eg-chessboard';

const { showSuccess } = useFeedback();

interface EtapeBase {
  type: 'pgn' | 'qcm' | 'puzzle' | 'move';
  pgn_data?: string;
  fen?: string;
  fenDepart?: string;
  question?: string;
  choix?: string[];
  bonne_reponse?: number;
  shapes?: DrawShape[];
  solution?: string[] | string;
  coup?: string;
  couleur_joueur?: 'white' | 'black';
  couleurJoueur?: 'white' | 'black';
}

interface ConfigPartieHeros {
  etapes: EtapeBase[];
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

const headerMeta = computed(() => {
  return {
    title: props.config?.metaTitre || 'T4 - Partie du Héros',
    typeLabel: props.config?.metaTypeLabel || 'Partie du Héros',
    chapitreNiveauLabel: props.config?.metaChapitreNiveauLabel || '',
  };
});

const store = useApprentissageStore();
const etapeCouranteIndex = ref(0);

const estDerniereEtape = computed(() => {
  if (!props.config || !props.config.etapes) return true;
  return etapeCouranteIndex.value === props.config.etapes.length - 1;
});

const etapeActuelle = computed<EtapeBase>(() => {
  if (!props.config || !props.config.etapes) {
    return { type: 'pgn' } as EtapeBase;
  }
  return props.config.etapes[etapeCouranteIndex.value] || ({ type: 'pgn' } as EtapeBase);
});

const transitionToNextStage = async () => {
  if (estDerniereEtape.value) {
    await showSuccess("Félicitations ! Vous avez terminé ce scénario !", 3000);
    store.validerElement(props.id);
    emit('success');
  } else {
    etapeCouranteIndex.value++;
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
  gap: 16px;
}
</style>
