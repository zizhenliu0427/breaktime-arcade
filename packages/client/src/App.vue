<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
</script>

<template>
  <header class="topbar">
    <RouterLink to="/" class="brand">
      <span class="brand-mark">🎉</span>
      <span class="brand-name">Breaktime Arcade</span>
    </RouterLink>
    <button class="lang" type="button" title="More languages coming later">
      EN <span class="lang-caret">▾</span>
    </button>
  </header>
  <main>
    <RouterView />
  </main>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--violet-800);
  color: #fff;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  color: inherit;
  text-decoration: none;
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
}

.brand-mark {
  font-size: 1.2rem;
}

.lang {
  background: rgb(255 255 255 / 0.14);
  color: #fff;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 0.85rem;
  font-weight: 700;
  transition: background var(--t-fast);
}

.lang:hover {
  background: rgb(255 255 255 / 0.24);
}

.lang-caret {
  opacity: 0.75;
  font-size: 0.7rem;
}
</style>
