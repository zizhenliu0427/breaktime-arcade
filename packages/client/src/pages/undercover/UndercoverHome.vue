<script setup lang="ts">
interface Mode {
  title: string;
  desc: string;
  emoji: string;
  to?: string;
  soon?: boolean;
}

const modes: Mode[] = [
  {
    title: 'Pass & Play',
    desc: 'Share one device within your group. Works without a network.',
    emoji: '🤝',
    to: '/undercover/pass-and-play',
  },
  {
    title: 'Host a Live Room',
    desc: 'The presenter controls the game from a computer while everyone joins by QR code.',
    emoji: '📡',
    soon: true,
  },
  {
    title: 'Presenter Demo',
    desc: 'Demonstrate the rules on one screen — no real secrets handed out.',
    emoji: '📽️',
    soon: true,
  },
  {
    title: 'How to Play',
    desc: 'Learn the rules in under one minute.',
    emoji: '📖',
    to: '/undercover/how-to-play',
  },
];
</script>

<template>
  <div class="page">
    <h1 class="rise">🕵️ Who's Undercover?</h1>
    <p class="rise sub" style="animation-delay: 50ms">
      A quick social deduction word game. Choose a mode to begin.
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

.modes {
  display: grid;
  gap: 12px;
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
