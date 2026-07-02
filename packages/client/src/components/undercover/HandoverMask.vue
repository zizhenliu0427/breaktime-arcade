<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import BaseButton from '../ui/BaseButton.vue';

const { t } = useI18n();

defineProps<{
  playerName: string;
  /** What the player is about to do, e.g. "see your secret word". */
  task: string;
}>();

const emit = defineEmits<{ ready: [] }>();
</script>

<template>
  <div class="mask pop">
    <div class="shield" aria-hidden="true">🔒</div>
    <h2>{{ t('passPlay.passDeviceTo') }}</h2>
    <div class="name">{{ playerName }}</div>
    <p>{{ t('passPlay.maskWarning', { name: playerName }) }}</p>
    <BaseButton variant="accent" size="lg" @click="emit('ready')">
      {{ t('passPlay.imReadyBtn', { name: playerName }) }}
    </BaseButton>
    <p class="task">{{ t('passPlay.nextTask', { task: task }) }}</p>
  </div>
</template>

<style scoped>
.mask {
  background: linear-gradient(165deg, var(--violet-800), var(--violet-900));
  color: #fff;
  border-radius: var(--radius-l);
  padding: 40px 24px;
  text-align: center;
  box-shadow: var(--shadow-l);
}

.shield {
  font-size: 2.4rem;
  margin-bottom: 8px;
}

h2 {
  font-size: 1rem;
  font-weight: 700;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
}

.name {
  font-size: clamp(1.9rem, 8vw, 2.6rem);
  font-weight: 800;
  margin-bottom: 10px;
}

p {
  opacity: 0.85;
  max-width: 26em;
  margin: 0 auto 22px;
}

.task {
  margin: 18px 0 0;
  font-size: 0.85rem;
  opacity: 0.65;
}
</style>
