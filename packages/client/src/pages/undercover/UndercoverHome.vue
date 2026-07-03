<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface Mode {
  title: string;
  desc: string;
  emoji: string;
  to?: string;
  soon?: boolean;
}

const modes = computed<Mode[]>(() => [
  {
    title: t('undercover.passPlay'),
    desc: t('undercover.passPlayDesc'),
    emoji: '🤝',
    to: '/undercover/pass-and-play',
  },
  {
    title: t('undercover.hostRoom'),
    desc: t('undercover.hostRoomDesc'),
    emoji: '📡',
    to: '/undercover/host',
  },
  {
    title: t('undercover.demo'),
    desc: t('undercover.demoDesc'),
    emoji: '📽️',
    to: '/undercover/demo',
  },
  {
    title: t('undercover.simulate'),
    desc: t('undercover.simulateDesc'),
    emoji: '🤖',
    to: '/undercover/simulate',
  },
  {
    title: t('undercover.howToPlay'),
    desc: t('undercover.howToPlayDesc'),
    emoji: '📖',
    to: '/undercover/how-to-play',
  },
]);
</script>

<template>
  <div class="page page-undercover">
    <h1 class="rise">{{ t('undercover.title') }}</h1>
    <p class="rise sub" style="animation-delay: 50ms">
      {{ t('undercover.subtitle') }}
    </p>

    <div class="modes">
      <component
        :is="mode.to ? 'router-link' : 'div'"
        v-for="(mode, i) in modes"
        :key="mode.title"
        :to="mode.to"
        class="mode card rise"
        :class="{ soon: mode.soon }"
        :style="{ animationDelay: `${90 + i * 60}ms` }"
      >
        <span class="emoji" aria-hidden="true">{{ mode.emoji }}</span>
        <div>
          <h2>
            {{ mode.title }}
            <span v-if="mode.soon" class="soon-badge">Coming soon</span>
          </h2>
          <p>{{ mode.desc }}</p>
        </div>
      </component>
    </div>
  </div>
</template>

<style scoped>
h1 {
  font-size: clamp(1.6rem, 5vw, 2.2rem);
}

.sub {
  color: var(--ink-soft);
  margin-bottom: 22px;
}

.page-undercover {
  max-width: 880px;
}

.modes {
  display: grid;
  gap: 12px;
}

@media (min-width: 720px) {
  .modes {
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .mode {
    padding: 24px;
  }
}

.mode {
  display: flex;
  gap: 14px;
  align-items: center;
  color: inherit;
  text-decoration: none;
  transition:
    transform var(--t-fast) var(--ease-pop),
    box-shadow var(--t-fast);
}

a.mode:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-m);
}

a.mode:hover .emoji {
  animation: wiggle 450ms var(--ease-pop);
}

.mode h2 {
  font-size: 1.1rem;
  margin: 0 0 2px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mode p {
  margin: 0;
  color: var(--ink-soft);
  font-size: 0.92rem;
}

.emoji {
  font-size: 1.9rem;
  display: inline-block;
}

.soon {
  opacity: 0.66;
}

.soon-badge {
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: var(--violet-050);
  color: var(--ink-soft);
  border-radius: 999px;
  padding: 2px 8px;
}
</style>
