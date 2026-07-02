<script setup lang="ts">
import { computed } from 'vue';
import BaseButton from '../ui/BaseButton.vue';
import { usePassPlayStore } from '../../stores/passPlay';

const store = usePassPlayStore();
const eliminated = computed(() => store.eliminatedPlayer);
const roleLabel = computed(() => {
  switch (store.game?.lastElimination?.role) {
    case 'undercover':
      return 'the Undercover';
    case 'mrWhite':
      return 'Mr White';
    default:
      return 'a Civilian';
  }
});
</script>

<template>
  <div class="elim pop">
    <template v-if="eliminated">
      <div class="flip-card" aria-hidden="true">
        <div class="flip-inner">
          <span class="face front">🗳️</span>
          <span class="face back">{{ store.game?.lastElimination?.role === 'civilian' ? '😇' : '🕵️' }}</span>
        </div>
      </div>
      <h2>{{ eliminated.name }} received the most votes.</h2>
      <p class="role-line">
        {{ eliminated.name }} was <strong>{{ roleLabel }}</strong
        >.
      </p>
      <p class="note">Their word stays hidden until the game ends.</p>
    </template>

    <template v-else>
      <div class="tie" aria-hidden="true">🤝</div>
      <h2>Still tied!</h2>
      <p class="role-line">Nobody is eliminated this round.</p>
    </template>

    <BaseButton variant="accent" size="lg" block @click="store.continueAfterElimination()">
      Next round
    </BaseButton>
  </div>
</template>

<style scoped>
.elim {
  text-align: center;
}

.flip-card {
  width: 96px;
  height: 96px;
  margin: 0 auto 16px;
  perspective: 500px;
}

.flip-inner {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  animation: flip 900ms var(--ease-pop) 250ms both;
}

@keyframes flip {
  from {
    transform: rotateY(0);
  }
  to {
    transform: rotateY(180deg);
  }
}

.face {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 3rem;
  background: var(--surface);
  border-radius: var(--radius-m);
  box-shadow: var(--shadow-m);
  backface-visibility: hidden;
}

.face.back {
  transform: rotateY(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .flip-inner {
    animation: none;
    transform: rotateY(180deg);
  }
}

.tie {
  font-size: 3rem;
  margin-bottom: 10px;
}

h2 {
  font-size: 1.25rem;
}

.role-line {
  font-size: 1.05rem;
  margin-bottom: 6px;
}

.note {
  color: var(--ink-soft);
  font-size: 0.88rem;
  margin-bottom: 22px;
}
</style>
