<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import BaseButton from '../ui/BaseButton.vue';
import TimerRing from '../ui/TimerRing.vue';
import { usePassPlayStore } from '../../stores/passPlay';

const store = usePassPlayStore();
const total = store.game?.config.discussSeconds ?? 45;
const remaining = ref(total);
let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  timer = setInterval(() => {
    remaining.value -= 1;
    if (remaining.value <= 0) {
      clearInterval(timer);
      store.beginVoting();
    }
  }, 1000);
});

onUnmounted(() => clearInterval(timer));
</script>

<template>
  <div class="discuss pop">
    <h2>💬 Discuss</h2>
    <p class="sub">Who gave a suspicious clue? Talk it over — then vote.</p>

    <div class="ring">
      <TimerRing :remaining="remaining" :total="total" :size="150" />
    </div>

    <BaseButton variant="accent" size="lg" block @click="store.beginVoting()">
      We're ready — start voting
    </BaseButton>
  </div>
</template>

<style scoped>
.discuss {
  text-align: center;
}

h2 {
  font-size: 1.3rem;
}

.sub {
  color: var(--ink-soft);
  margin-bottom: 20px;
}

.ring {
  display: grid;
  place-items: center;
  margin-bottom: 24px;
}
</style>
