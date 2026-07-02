<script setup lang="ts">
import { ref } from 'vue';
import BaseButton from '../ui/BaseButton.vue';
import HandoverMask from './HandoverMask.vue';
import { usePassPlayStore } from '../../stores/passPlay';

const store = usePassPlayStore();
const choice = ref<string | null>(null);

function confirm() {
  if (!choice.value) return;
  const target = choice.value;
  choice.value = null;
  store.submitVote(target);
}
</script>

<template>
  <HandoverMask
    v-if="store.masked && store.currentVoter"
    :player-name="store.currentVoter.name"
    task="cast your secret vote"
    @ready="store.unmask()"
  />

  <div v-else-if="store.currentVoter" class="vote pop">
    <div v-if="store.game?.isRunoffVote" class="runoff-note" role="status">
      Tie-break revote — choose between the tied players only.
    </div>

    <h2>🗳️ {{ store.currentVoter.name }}, cast your vote</h2>
    <p class="sub">Who do you think is the Undercover? Your vote stays secret.</p>

    <div class="targets" role="radiogroup" aria-label="Vote for a player">
      <button
        v-for="target in store.currentTargets"
        :key="target.id"
        type="button"
        class="target"
        role="radio"
        :aria-checked="choice === target.id"
        :class="{ chosen: choice === target.id }"
        @click="choice = choice === target.id ? null : target.id"
      >
        <span class="target-name">{{ target.name }}</span>
        <span v-if="choice === target.id" class="check pop">✓</span>
      </button>
    </div>

    <BaseButton variant="accent" size="lg" block :disabled="!choice" @click="confirm">
      Confirm vote
    </BaseButton>

    <div class="progress">
      Vote {{ store.voterIndex + 1 }} of {{ store.voters.length }}
    </div>
  </div>
</template>

<style scoped>
h2 {
  font-size: 1.25rem;
}

.sub {
  color: var(--ink-soft);
  margin-bottom: 18px;
}

.runoff-note {
  background: #fdf1dc;
  color: #8a5b00;
  font-weight: 700;
  border-radius: var(--radius-s);
  padding: 10px 14px;
  margin-bottom: 14px;
}

.targets {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 20px;
}

.target {
  position: relative;
  background: var(--surface);
  border-radius: var(--radius-m);
  box-shadow: var(--shadow-s);
  padding: 18px 12px;
  font-weight: 800;
  font-size: 1.02rem;
  transition: transform var(--t-fast) var(--ease-pop), box-shadow var(--t-fast);
}

.target:active {
  transform: translateY(2px);
}

.target.chosen {
  box-shadow: 0 0 0 3px var(--violet-600), var(--shadow-m);
  background: var(--violet-050);
}

.check {
  position: absolute;
  top: -8px;
  right: -6px;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: var(--success);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 0.9rem;
  box-shadow: var(--shadow-s);
}

.progress {
  margin-top: 16px;
  text-align: center;
  color: var(--ink-soft);
  font-size: 0.88rem;
  font-weight: 700;
}
</style>
