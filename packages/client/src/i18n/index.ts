import { createI18n } from 'vue-i18n';
import en from './en';
import zh from './zh';

const i18n = createI18n({
  legacy: false,          // Composition API mode
  locale: localStorage.getItem('locale') || 'en',
  fallbackLocale: 'en',
  messages: { en, zh },
});

export default i18n;

/** Helper to toggle & persist locale. */
export function toggleLocale() {
  const current = i18n.global.locale.value;
  const next = current === 'en' ? 'zh' : 'en';
  i18n.global.locale.value = next;
  localStorage.setItem('locale', next);
}
