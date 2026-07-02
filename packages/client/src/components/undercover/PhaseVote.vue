<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseButton from '../ui/BaseButton.vue';
import HandoverMask from './HandoverMask.vue';
import { usePassPlayStore } from '../../stores/passPlay';

const { t } = useI18n();
const store = usePassPlayStore();
const choice = ref<string | null>(null);

const isSelfVote = computed(() => {
  if (!choice.value || !store.currentVoter) return false;
  return choice.value === store.currentVoter.id;
});

function confirm() {
  if (!choice.value) return;
  if (isSelfVote.value) {
    if (!window.confirm(t('game.selfVoteWarning'))) return;
  }
  const target = choice.value;
  choice.value = null;
  store.submitVote(target);
}
</script>

<template>
  <HandoverMask
    v-if="store.masked && store.currentVoter"
    :player-name="store.currentVoter.name"
    :task="t('passPlay.taskVote')"
    @ready="store.unmask()"
  />

  <div v-else-if="store.currentVoter" class="vote pop">
    <div v-if="store.game?.isRunoffVote" class="runoff-note" role="status">
      {{ t('passPlay.tieBreakRevoteHint') }}
    </div>

    <h2>🗳️ {{ t('passPlay.personalVotePrompt', { name: store.currentVoter.name }) }}</h2>
    <p class="sub">{{ t('game.whoIsUndercoverPlayer') }}</p>

    <div class="targets" role="radiogroup" aria-label="Vote for a player">
      <button
        v-for="target in store.currentTargets"
        :key="target.id"
        type="button"
        class="target"
        role="radio"
        :aria-checked="choice === target.id"
        :class="{ chosen: choice === target.id, 'self-target': store.currentVoter?.id === target.id }"
        @click="choice = choice === target.id ? null : target.id"
      >
        <span class="target-name">{{ target.name }}<span v-if="store.currentVoter?.id === target.id" class="you-tag"> {{ t('game.you') }}</span></span>
        <span v-if="choice === target.id" class="check pop">✓</span>
      </button>
    </div>

    <div v-if="isSelfVote" class="self-warn" role="alert">
      {{ t('game.selfWarn') }}
    </div>

    <BaseButton variant="accent" size="lg" block :disabled="!choice" @click="confirm">
      {{ isSelfVote ? t('game.confirmSelfVote') : t('game.confirmVote') }}
    </BaseButton>

    <div class="progress">
      {{ t('passPlay.voteProgress', { i: store.voterIndex + 1, total: store.voters.length }) }}
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

.self-target {
  border: 2px dashed var(--accent);
}

.you-tag {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink-soft);
}

.self-warn {
  background: #fdf1dc;
  color: #8a5b00;
  font-weight: 700;
  border-radius: var(--radius-s);
  padding: 10px 14px;
  margin-bottom: 12px;
  font-size: 0.9rem;
}

.progress {
  margin-top: 16px;
  text-align: center;
  color: var(--ink-soft);
  font-size: 0.88rem;
  font-weight: 700;
}
</style>
