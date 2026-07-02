<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { usePassPlayStore } from '../../stores/passPlay';
import PhaseReveal from '../../components/undercover/PhaseReveal.vue';
import PhaseClue from '../../components/undercover/PhaseClue.vue';
import PhaseDiscuss from '../../components/undercover/PhaseDiscuss.vue';
import PhaseVote from '../../components/undercover/PhaseVote.vue';
import PhaseElimination from '../../components/undercover/PhaseElimination.vue';
import PhaseEnded from '../../components/undercover/PhaseEnded.vue';

const { t } = useI18n();
const store = usePassPlayStore();
const router = useRouter();

// Game state lives in memory only — a refresh (or direct visit) has no game,
// which is by design: nothing secret survives a reload (§23).
onMounted(() => {
  if (!store.game) router.replace('/undercover/pass-and-play');
});

function quit() {
  if (window.confirm(t('passPlay.confirmEndGame'))) {
    store.quit();
    router.push('/undercover');
  }
}
</script>

<template>
  <div class="page game" v-if="store.game">
    <div class="statusbar">
      <span class="round">{{ t('host.room.roundNum', { n: store.game.round }) }}</span>
      <span class="alive">{{ t('game.playersIn', { n: store.alivePlayers.length }) }}</span>
      <button class="quit" type="button" @click="quit">{{ t('passPlay.endGame') }}</button>
    </div>

    <Transition name="phase" mode="out-in">
      <PhaseReveal v-if="store.phase === 'reveal'" />
      <PhaseClue v-else-if="store.phase === 'clue' || store.phase === 'runoff'" />
      <PhaseDiscuss v-else-if="store.phase === 'discuss'" />
      <PhaseVote v-else-if="store.phase === 'vote'" />
      <PhaseElimination v-else-if="store.phase === 'elimination'" />
      <PhaseEnded v-else-if="store.phase === 'ended'" />
    </Transition>
  </div>
</template>

<style scoped>
.game {
  max-width: 560px;
}

.statusbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ink-soft);
}

.round {
  background: var(--violet-100);
  color: var(--violet-800);
  border-radius: 999px;
  padding: 3px 10px;
}

.alive {
  flex: 1;
}

.quit {
  background: none;
  color: var(--ink-soft);
  font-size: 0.82rem;
  font-weight: 700;
  text-decoration: underline;
  padding: 4px;
}

.phase-enter-active,
.phase-leave-active {
  transition: opacity var(--t-med), transform var(--t-med) var(--ease-pop);
}

.phase-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.phase-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
