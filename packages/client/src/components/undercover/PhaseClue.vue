<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseButton from '../ui/BaseButton.vue';
import { usePassPlayStore } from '../../stores/passPlay';

const { t } = useI18n();
const store = usePassPlayStore();
const isRunoff = computed(() => store.phase === 'runoff');
const speakerIndex = computed(() => store.game?.speakerIndex ?? 0);
</script>

<template>
  <div class="clue pop">
    <div v-if="isRunoff" class="runoff-banner" role="status">
      {{ t('passPlay.runoffBanner') }}
    </div>

    <h2>{{ isRunoff ? t('game.runoffTitle') : t('game.cluesTitle', { n: store.game?.round }) }}</h2>
    <p class="sub">
      {{ t('passPlay.clueInstruction') }}
    </p>

    <TransitionGroup name="speaker" tag="ol" class="order">
      <li
        v-for="(player, i) in store.clueOrder"
        :key="player.id"
        class="speaker"
        :class="{ current: i === speakerIndex, done: i < speakerIndex }"
      >
        <span class="num">{{ i + 1 }}</span>
        <span class="name">{{ player.name }}</span>
        <span v-if="i === speakerIndex" class="now">{{ t('passPlay.speakingNow') }}</span>
        <span v-else-if="i < speakerIndex" class="tick" aria-label="done">✓</span>
      </li>
    </TransitionGroup>

    <BaseButton variant="accent" size="lg" block @click="store.advanceSpeaker()">
      {{
        speakerIndex + 1 < store.clueOrder.length
          ? t('passPlay.doneNextSpeaker', { name: store.clueOrder[speakerIndex + 1]?.name })
          : isRunoff
            ? t('passPlay.allCluesRevote')
            : t('passPlay.allCluesDiscuss')
      }}
    </BaseButton>
  </div>
</template>

<style scoped>
h2 {
  font-size: 1.2rem;
}

.sub {
  color: var(--ink-soft);
  font-size: 0.92rem;
  margin-bottom: 18px;
}

.runoff-banner {
  background: #fdf1dc;
  color: #8a5b00;
  font-weight: 700;
  border-radius: var(--radius-s);
  padding: 10px 14px;
  margin-bottom: 14px;
}

.order {
  list-style: none;
  padding: 0;
  margin: 0 0 20px;
  display: grid;
  gap: 8px;
}

.speaker {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--surface);
  border-radius: var(--radius-m);
  padding: 12px 14px;
  box-shadow: var(--shadow-s);
  transition: transform var(--t-med) var(--ease-pop), box-shadow var(--t-med);
}

.speaker.current {
  transform: scale(1.03);
  box-shadow: 0 0 0 3px var(--violet-600), var(--shadow-m);
}

.speaker.done {
  opacity: 0.55;
}

.num {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: var(--violet-100);
  color: var(--violet-800);
  font-weight: 800;
  font-size: 0.85rem;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.current .num {
  background: var(--violet-700);
  color: #fff;
}

.name {
  font-weight: 700;
  flex: 1;
}

.now {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--violet-700);
  animation: now-pulse 1.4s ease-in-out infinite;
}

@keyframes now-pulse {
  50% {
    opacity: 0.45;
  }
}

@media (prefers-reduced-motion: reduce) {
  .now {
    animation: none;
  }
}

.tick {
  color: var(--success);
  font-weight: 800;
}
</style>
