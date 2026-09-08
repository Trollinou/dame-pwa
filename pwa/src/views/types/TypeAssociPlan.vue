<template>
  <div class="exercice-type-associ-plan">
    <!-- Header unifié avec métadonnées et consigne contextuelle -->
    <ContentHeader
      :title="headerMeta.title"
      :typeLabel="headerMeta.typeLabel"
      :chapitreNiveauLabel="headerMeta.chapitreNiveauLabel"
      :consigne="consigneActuelle"
      :stepBadgeText="`Carte ${carteCourante} / 5`"
    />

    <!-- Carte 1 : Phase de matching (Association) -->
    <div v-if="carteCourante === 1" class="phase-container matching-phase">
      <MatchingViewer
        :paires="pairesFormateesPourMatching"
        @success="onMatchingSuccess"
        @feedback="onMatchingFeedback"
      />

      <!-- Footer Série pour la Carte 1 (Matching) -->
      <SeriesCardFooter
        :currentCard="1"
        :totalCards="5"
        :isSolved="matchingReussi"
        :feedback="carte1Feedback"
        pendingHint="Associez correctement les 4 diagrammes et descriptions pour continuer"
        nextText="Position suivante"
        @next="passerCarteSuivante"
      />
    </div>

    <!-- Cartes 2 à 5 : Visualisation individuelle des PGNs 1 à 4 -->
    <div v-else-if="carteCourante >= 2 && carteCourante <= 5" class="phase-container pgn-phase">
      <div v-if="paireActive" class="pgn-card-wrapper">
        <PgnViewer
          :key="`pgn-view-${carteCourante}`"
          :pgnString="paireActive.pgn"
          :orientation="paireActive.couleurJoueur"
          @finished="onPgnFinished"
        />

        <!-- Footer Série pour les Cartes PGN (Cartes 2 à 5) -->
        <SeriesCardFooter
          :currentCard="carteCourante"
          :totalCards="5"
          :isSolved="pgnVisionne"
          :feedback="pgnVisionne ? { type: 'success', message: 'Plan visualisé avec succès !' } : null"
          pendingHint="Déroulez tous les coups du PGN jusqu'au bout pour continuer"
          :nextText="carteCourante === 5 ? 'Terminer l\'exercice' : 'Position suivante'"
          :finishText="'Terminer l\'exercice'"
          @next="passerCarteSuivante"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import ContentHeader from '@/components/shared/ContentHeader.vue';
import SeriesCardFooter, { type CardFeedback } from '@/components/shared/SeriesCardFooter.vue';
import MatchingViewer from '@/components/shared/MatchingViewer.vue';
import PgnViewer from '@/components/shared/PgnViewer.vue';
import {
  parseAssociPlanPaires,
  type AssociPlanPaire,
} from '@/utils/associPlanParser';

interface PaireRaw {
  pgn?: string;
  pgn_data?: string;
}

interface ConfigAssociPlan {
  paires: PaireRaw[];
  metaTitre?: string;
  metaTypeLabel?: string;
  metaChapitreNiveauLabel?: string;
}

const props = defineProps<{
  config: ConfigAssociPlan;
  id: number;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

// État de navigation (Cartes 1 à 5)
const carteCourante = ref(1);

// État de validation de la carte 1
const matchingReussi = ref(false);

// Feedback contextuel de la carte 1 (succès ou erreur)
const carte1Feedback = ref<CardFeedback | null>(null);

// État de visionnage complet du PGN de la carte courante (Cartes 2 à 5)
const pgnVisionne = ref(false);

// Extraction et parsing des 4 PGNs
const paires = computed<AssociPlanPaire[]>(() => {
  return parseAssociPlanPaires(props.config?.paires || []);
});

// Paires formatées pour le composant MatchingViewer
const pairesFormateesPourMatching = computed(() => {
  return paires.value.map((p) => ({
    fen: p.fen,
    couleur_joueur: p.couleurJoueur,
    description: p.description,
    shapes: p.shapes,
  }));
});

// Paire active pour les cartes 2 à 5 (index 0 à 3)
const paireActive = computed<AssociPlanPaire | null>(() => {
  const index = carteCourante.value - 2;
  return paires.value[index] || null;
});

// Métadonnées du ContentHeader
const headerMeta = computed(() => ({
  title: props.config?.metaTitre || 'T6 - Associ\'Plan',
  typeLabel: props.config?.metaTypeLabel || 'Associ\'Plan',
  chapitreNiveauLabel: props.config?.metaChapitreNiveauLabel || '',
}));

// Consigne contextuelle dynamique selon la carte
const consigneActuelle = computed(() => {
  if (carteCourante.value === 1) {
    return 'Associez chaque diagramme à sa description.';
  }
  const planNum = carteCourante.value - 1;
  return `Plan ${planNum}`;
});

// Gestion du succès du matching (Carte 1)
const onMatchingSuccess = () => {
  matchingReussi.value = true;
};

// Gestion du feedback (succès / erreur) émis par le MatchingViewer
const onMatchingFeedback = (feedback: CardFeedback | null) => {
  carte1Feedback.value = feedback;
};

// Gestion du visionnage complet d'un PGN (Cartes 2 à 5)
const onPgnFinished = () => {
  pgnVisionne.value = true;
};

// Réinitialisation de l'état de complétion lors d'un changement de carte
watch(carteCourante, (newCard) => {
  if (newCard >= 2) {
    // Si la carte active a un PGN vide ou 0 coups, on peut la considérer immédiatement visionnée
    const pgn = paireActive.value?.pgn || '';
    const hasMoves = /\b\d+\s*\./.test(pgn);
    pgnVisionne.value = !hasMoves;
  }
});

// Passage à la carte suivante ou validation finale
const passerCarteSuivante = () => {
  if (carteCourante.value < 5) {
    carteCourante.value++;
  } else {
    // Carte 5/5 validée -> fin de l'exercice
    emit('success');
  }
};
</script>

<style scoped>
.exercice-type-associ-plan {
  width: 100%;
}

.phase-container {
  width: 100%;
  animation: fadeIn 0.3s ease-out;
}

.phase-container.matching-phase {
  padding-bottom: 60px;
}

.pgn-card-wrapper {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
