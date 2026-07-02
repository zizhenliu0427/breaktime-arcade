<script setup lang="ts">
import { ref } from 'vue';
import BaseButton from '../ui/BaseButton.vue';
import HandoverMask from './HandoverMask.vue';
import { usePassPlayStore } from '../../stores/passPlay';

const store = usePassPlayStore();
const holding = ref(false);
const hasPeeked = ref(false);

function press() {
  holding.value = true;
  hasPeeked.value = true;
}

function release() {
  holding.value = false;
}

function memorised() {
  hasPeeked.value = false;
  holding.value = false;
  store.finishReveal();
}
</script>

<template>
  <HandoverMask
    v-if="store.masked && store.revealPlayer"
    :player-name="store.revealPlayer.name"
    task="see your secret word"
    @ready="store.unmask()"
  />

  <div v-else-if="store.revealPlayer" class="reveal pop">
    <p class="who">{{ store.revealPlayer.name }}, this word is for your eyes only.</p>

    <button
      class="word-card"
      :class="{ holding }"
      type="button"
      @pointerdown.prevent="press"
      @pointerup="release"
      @pointerleave="release"
      @pointercancel="release"
      @contextmenu.prevent
    >
      <span v-if="holding" class="word pop">
        {{ store.revealPlayer.word ?? 'You have NO word — you are Mr White. Blend in!' }}
      </span>
      <span v-else class="prompt">
        <span class="eye" aria-hidden="true">👁️</span>
        Press and hold to reveal
      </span>
    </button>

    <p class="hint">Your word hides again the moment you let go.</p>

    <BaseButton variant="primary" size="lg" block :disabled="!hasPeeked" @click="memorised">
      I've memorised my word
    </BaseButton>

    <div class="progress">
      Player {{ (store.game?.revealIndex ?? 0) + 1 }} of {{ store.players.length }}
    </div>
  </div>
</template>

<style scoped>
.reveal {
  text-align: center;
}

.who {
  font-weight: 700;
  margin-bottom: 14px;
}

.word-card {
  width: 100%;
  min-height: 180px;
  border-radius: var(--radius-l);
  background: var(--surface);
  box-shadow: var(--shadow-m);
  display: grid;
  place-items: center;
  padding: 24px;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  transition: background var(--t-fast), transform var(--t-fast) var(--ease-pop);
}

.word-card.holding {
  background: var(--violet-800);
  transform: scale(1.02);
}

.prompt {
  color: var(--ink-soft);
  font-weight: 700;
  display: grid;
  gap: 6px;
  justify-items: center;
}

.eye {
  font-size: 1.8rem;
}

.word {
  color: #fff;
  font-size: clamp(1.7rem, 8vw, 2.6rem);
  font-weight: 800;
  overflow-wrap: anywhere;
}

.hint {
  color: var(--ink-soft);
  font-size: 0.85rem;
  margin: 12px 0 18px;
}

.progress {
  margin-top: 16px;
  color: var(--ink-soft);
  font-size: 0.88rem;
  font-weight: 700;
}
</style>
