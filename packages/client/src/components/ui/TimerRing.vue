<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  /** Seconds remaining. */
  remaining: number;
  /** Total seconds for the phase. */
  total: number;
  size?: number;
}>();

const size = computed(() => props.size ?? 120);
const r = 45;
const circumference = 2 * Math.PI * r;
const fraction = computed(() =>
  props.total > 0 ? Math.max(0, Math.min(1, props.remaining / props.total)) : 0,
);
const dashOffset = computed(() => circumference * (1 - fraction.value));
const urgent = computed(() => props.remaining <= 10 && props.remaining > 0);
</script>

<template>
  <div class="timer" :class="{ urgent }" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle class="track" cx="50" cy="50" :r="r" />
      <circle
        class="progress"
        cx="50"
        cy="50"
        :r="r"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
      />
    </svg>
    <div class="label" role="timer" :aria-label="`${Math.ceil(remaining)} seconds remaining`">
      {{ Math.max(0, Math.ceil(remaining)) }}
    </div>
  </div>
</template>

<style scoped>
.timer {
  position: relative;
  display: grid;
  place-items: center;
}

svg {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}

.track {
  fill: none;
  stroke: var(--violet-100);
  stroke-width: 8;
}

.progress {
  fill: none;
  stroke: var(--violet-600);
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s linear, stroke var(--t-med);
}

.urgent .progress {
  stroke: var(--danger);
}

.label {
  font-size: 1.8rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.urgent .label {
  color: var(--danger);
  animation: tick-pulse 1s ease-in-out infinite;
}

@keyframes tick-pulse {
  50% {
    transform: scale(1.12);
  }
}

@media (prefers-reduced-motion: reduce) {
  .urgent .label {
    animation: none;
  }
}
</style>
