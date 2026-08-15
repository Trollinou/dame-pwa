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

<style scoped>
.game-meta-card {
  background: var(--ion-card-background, #ffffff);
  border-radius: 12px;
  padding: 10px 14px;
  margin-bottom: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--ion-color-step-100, #e9ecef);
}

.meta-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.meta-left {
  display: flex;
  flex-direction: column;
}

.player-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
  color: var(--ion-text-color, #111827);
  letter-spacing: -0.2px;
}

.game-type-subtitle {
  font-size: 0.78rem;
  color: var(--ion-color-primary, #3880ff);
  font-weight: 600;
  margin: 2px 0 0 0;
}

.meta-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.elo-badge {
  background: var(--ion-color-primary, #3880ff);
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  letter-spacing: 0.3px;
}

.elo-badge.local-badge {
  background: var(--ion-color-secondary, #3dc2ff);
}

.level-label {
  font-size: 0.72rem;
  color: var(--ion-color-step-600, #6b7280);
  margin-top: 2px;
  font-weight: 500;
}
</style>
