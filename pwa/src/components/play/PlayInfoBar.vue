<template>
  <div class="game-meta-card">
    <div class="meta-main">
      <div class="meta-left">
        <h2 class="player-title">{{ playerName }}</h2>
        <p class="game-type-subtitle">
          <template v-if="gameMode === '2players'">
            Partie locale // Pass & Play
          </template>
          <template v-else>
            Solo vs Stockfish // Ordinateur
          </template>
        </p>
      </div>

      <div class="meta-right">
        <span v-if="gameMode !== '2players'" class="elo-badge">
          {{ level }} ELO
        </span>
        <span v-else class="elo-badge local-badge">
          2 Joueurs
        </span>
        <span v-if="gameMode !== '2players'" class="level-label">
          {{ getLevelDescription(level) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    playerName: string;
    level: number;
    gameMode?: '1player' | '2players';
  }>(),
  {
    gameMode: '1player'
  }
);

const getLevelDescription = (elo: number) => {
  if (elo <= 1400) return 'Débutant';
  if (elo <= 1700) return 'Intermédiaire';
  if (elo <= 2000) return 'Avancé';
  if (elo <= 2300) return 'Club / Expert';
  return 'Maître';
};
</script>
