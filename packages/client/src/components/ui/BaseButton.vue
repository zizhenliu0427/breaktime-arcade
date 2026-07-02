<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'accent' | 'ghost' | 'danger';
    size?: 'md' | 'lg';
    block?: boolean;
    disabled?: boolean;
  }>(),
  { variant: 'primary', size: 'md', block: false, disabled: false },
);
</script>

<template>
  <button
    class="btn"
    :class="[`v-${variant}`, `s-${size}`, { block }]"
    :disabled="disabled"
    type="button"
  >
    <slot />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: var(--radius-m);
  font-weight: 800;
  letter-spacing: 0.01em;
  transition:
    transform var(--t-fast) var(--ease-pop),
    box-shadow var(--t-fast),
    background var(--t-fast);
  box-shadow: var(--shadow-s);
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-m);
}

.btn:active:not(:disabled) {
  transform: translateY(2px) scale(0.99);
  box-shadow: none;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.s-md {
  padding: 12px 20px;
  font-size: 1rem;
}

.s-lg {
  padding: 16px 26px;
  font-size: 1.15rem;
  border-radius: var(--radius-l);
}

.block {
  display: flex;
  width: 100%;
}

.v-primary {
  background: var(--violet-700);
  color: #fff;
}

.v-primary:hover:not(:disabled) {
  background: var(--violet-600);
}

.v-accent {
  background: var(--accent);
  color: #fff;
}

.v-accent:hover:not(:disabled) {
  background: var(--accent-press);
}

.v-ghost {
  background: var(--surface);
  color: var(--violet-700);
  box-shadow: inset 0 0 0 2px var(--violet-100);
}

.v-ghost:hover:not(:disabled) {
  background: var(--violet-050);
}

.v-danger {
  background: var(--danger);
  color: #fff;
}
</style>
