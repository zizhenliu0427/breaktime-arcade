<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import BaseButton from '../../components/ui/BaseButton.vue';

const { t } = useI18n();
</script>

<template>
  <div class="page">
    <h1 class="rise">{{ t('howTo.title') }}</h1>

    <div class="card rise" style="animation-delay: 60ms">
      <ol class="steps">
        <li>
          <strong>{{ t('howTo.step1title') }}</strong> {{ t('howTo.step1') }}
        </li>
        <li>
          <strong>{{ t('howTo.step2title') }}</strong> {{ t('howTo.step2') }}
        </li>
        <li>
          <strong>{{ t('howTo.step3title') }}</strong> {{ t('howTo.step3') }}
        </li>
        <li>
          <strong>{{ t('howTo.step4title') }}</strong> {{ t('howTo.step4') }}
        </li>
        <li>
          <strong>{{ t('howTo.step5title') }}</strong> {{ t('howTo.step5') }}
        </li>
      </ol>
      <p class="tip">
        {{ t('howTo.tip') }}
      </p>
      <p class="tip tip-note">
        {{ t('howTo.mrWhiteNote') }}
      </p>
    </div>

    <div class="actions rise" style="animation-delay: 120ms">
      <router-link to="/undercover/pass-and-play">
        <BaseButton variant="accent" size="lg">{{ t('howTo.playNow') }}</BaseButton>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.steps {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 12px;
}

.tip {
  margin: 18px 0 0;
  background: var(--violet-050);
  border-radius: var(--radius-s);
  padding: 12px 14px;
  font-size: 0.92rem;
}

.tip-note {
  margin-top: 8px;
  background: var(--surface);
  box-shadow: inset 0 0 0 2px var(--line);
  color: var(--ink-soft);
}

.actions {
  margin-top: 20px;
  text-align: center;
}

.actions a {
  text-decoration: none;
}
</style>
