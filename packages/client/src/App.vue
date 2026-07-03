<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { toggleLocale } from './i18n';

const { t, locale } = useI18n();
const currentLangLabel = computed(() => (locale.value === 'zh' ? '中文' : 'EN'));
</script>

<template>
  <header class="topbar">
    <RouterLink to="/" class="brand">
      <span class="brand-mark">🎉</span>
      <span class="brand-name">{{ t('nav.brand') }}</span>
    </RouterLink>
    <button class="lang" type="button" @click="toggleLocale">
      {{ currentLangLabel }}
    </button>
  </header>
  <main>
    <RouterView />
  </main>
  <footer class="footer">
    <span class="footer-brand">{{ t('footer.brand') }}</span>
    <span class="footer-note">{{ t('footer.note') }}</span>
  </footer>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--violet-800);
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 20;
  box-shadow: var(--shadow-s);
}

@media (min-width: 900px) {
  .topbar {
    padding: 12px 28px;
  }
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
  display: inline-block;
}

.brand:hover .brand-mark {
  animation: wiggle 450ms var(--ease-pop);
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

.footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
  padding: 22px 16px 26px;
  background: linear-gradient(160deg, var(--violet-900), var(--violet-800));
  color: #fff;
}

.footer-brand {
  font-weight: 800;
  letter-spacing: -0.01em;
}

.footer-note {
  font-size: 0.82rem;
  opacity: 0.75;
}

@media (min-width: 700px) {
  .footer {
    flex-direction: row;
    justify-content: space-between;
    text-align: left;
    padding: 20px 28px;
  }
}
</style>
