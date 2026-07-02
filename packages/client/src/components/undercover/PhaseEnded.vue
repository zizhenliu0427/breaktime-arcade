<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BaseButton from '../ui/BaseButton.vue';
import { usePassPlayStore } from '../../stores/passPlay';

const { t } = useI18n();
const store = usePassPlayStore();
const router = useRouter();

const civiliansWin = computed(() => store.game?.winner === 'civilians');
const undercover = computed(() => store.players.find((p) => p.role === 'undercover'));
const civilianWord = computed(
  () => store.players.find((p) => p.role === 'civilian')?.word ?? '',
);

const confetti = Array.from({ length: 36 }, (_, i) => {
  const colours = ['#e0344a', '#2e6fe0', '#f5a623', '#2fa24b', '#6f3bd4'];
  return {
    id: i,
    style: {
      left: `${Math.random() * 100}%`,
      background: colours[i % colours.length],
      animationDelay: `${Math.random() * 0.9}s`,
      animationDuration: `${2 + Math.random() * 1.6}s`,
      transform: `rotate(${Math.random() * 360}deg)`,
    },
  };
});

function playAgain() {
  store.playAgain();
}

function backToMenu() {
  store.quit();
  router.push('/undercover');
}
</script>

<template>
  <div class="ended">
    <div class="confetti" aria-hidden="true">
      <span v-for="c in confetti" :key="c.id" class="piece" :style="c.style" />
    </div>

    <div class="result pop">
      <div class="trophy" aria-hidden="true">{{ civiliansWin ? '😇' : '🕵️' }}</div>
      <h2>{{ civiliansWin ? t('game.theCiviliansWin') : t('game.theUndercoverWins') }}</h2>
      <p class="reveal-line" v-html="t('game.undercoverWas', { label: t('game.vLabelPlayers'), name: undercover?.name })"></p>

      <div class="words">
        <div class="word-box civ">
          <span class="label">{{ t('game.civilianWord') }}</span>
          <span class="value">{{ civilianWord }}</span>
        </div>
        <div class="word-box uc">
          <span class="label">{{ t('game.undercoverWord') }}</span>
          <span class="value">{{ undercover?.word }}</span>
        </div>
      </div>

      <div class="actions">
        <BaseButton variant="accent" size="lg" block @click="playAgain">
          {{ t('passPlay.playAgainNewWords') }}
        </BaseButton>
        <BaseButton variant="ghost" block @click="backToMenu">{{ t('game.backToMenu') }}</BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ended {
  position: relative;
}

.confetti {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 1;
}

.piece {
  position: absolute;
  top: -14px;
  width: 10px;
  height: 14px;
  border-radius: 2px;
  animation: fall linear both;
}

@keyframes fall {
  to {
    transform: translateY(105vh) rotate(540deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .piece {
    display: none;
  }
}

.result {
  position: relative;
  z-index: 2;
  text-align: center;
  background: var(--surface);
  border-radius: var(--radius-l);
  box-shadow: var(--shadow-m);
  padding: 30px 22px;
}

.trophy {
  font-size: 3rem;
  margin-bottom: 8px;
}

h2 {
  font-size: 1.5rem;
}

.reveal-line {
  margin-bottom: 20px;
}

.words {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 22px;
}

.word-box {
  border-radius: var(--radius-m);
  padding: 14px 10px;
  display: grid;
  gap: 2px;
}

.word-box .label {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.75;
}

.word-box .value {
  font-size: 1.15rem;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.word-box.civ {
  background: #e8f1fd;
  color: #143a75;
}

.word-box.uc {
  background: #fde9ec;
  color: #7c1120;
}

.actions {
  display: grid;
  gap: 10px;
}
</style>
