<script setup lang="ts">
import { RouterLink } from 'vue-router';

interface GameCard {
  title: string;
  emoji: string;
  available: boolean;
  to?: string;
  tags: string[];
}

const games: GameCard[] = [
  {
    title: "Who's Undercover?",
    emoji: '🕵️',
    available: true,
    to: '/undercover',
    tags: ['4–10 players', '5–10 minutes', 'One device or a room'],
  },
  { title: 'Last Card', emoji: '🃏', available: false, tags: ['2–8 players', 'Turn-based'] },
  { title: 'Draw & Guess', emoji: '🎨', available: false, tags: ['Teams', 'Fast rounds'] },
  { title: 'Charades', emoji: '🎭', available: false, tags: ['Act it out'] },
  { title: 'Two Truths and a Lie', emoji: '🤥', available: false, tags: ['Icebreaker'] },
  { title: 'Quick Categories', emoji: '⚡', available: false, tags: ['Think fast'] },
];

/* Floating decorations for the hero — purely visual */
const decorations = [
  { emoji: '🕵️', style: { top: '18%', left: '7%', fontSize: '2.2rem', animationDuration: '5.2s' } },
  { emoji: '🃏', style: { top: '62%', left: '14%', fontSize: '1.7rem', animationDuration: '6.4s', animationDelay: '-2s' } },
  { emoji: '🎨', style: { top: '24%', right: '9%', fontSize: '2rem', animationDuration: '5.8s', animationDelay: '-1s' } },
  { emoji: '🎭', style: { top: '66%', right: '16%', fontSize: '1.8rem', animationDuration: '7s', animationDelay: '-3.4s' } },
  { emoji: '⚡', style: { top: '10%', left: '30%', fontSize: '1.4rem', animationDuration: '6s', animationDelay: '-4.2s' } },
  { emoji: '🤥', style: { top: '14%', right: '28%', fontSize: '1.4rem', animationDuration: '6.8s', animationDelay: '-2.6s' } },
];
</script>

<template>
  <div class="hero">
    <div class="hero-deco" aria-hidden="true">
      <span v-for="d in decorations" :key="d.emoji" class="deco" :style="d.style">
        {{ d.emoji }}
      </span>
    </div>
    <h1 class="rise">Breaktime Arcade</h1>
    <p class="rise" style="animation-delay: 60ms">
      Quick party games for the classroom, made for phones, tablets and computers.
    </p>
  </div>

  <div class="page page--wide">
    <div class="grid">
      <component
        :is="game.available ? RouterLink : 'div'"
        v-for="(game, i) in games"
        :key="game.title"
        :to="game.to"
        class="game-card rise"
        :class="{ locked: !game.available }"
        :style="{ animationDelay: `${80 + i * 55}ms` }"
      >
        <div class="emoji" aria-hidden="true">{{ game.emoji }}</div>
        <h2>{{ game.title }}</h2>
        <span class="status" :class="game.available ? 'live' : 'soon'">
          {{ game.available ? 'Available now' : 'Coming soon' }}
        </span>
        <ul class="tags">
          <li v-for="tag in game.tags" :key="tag">{{ tag }}</li>
        </ul>
      </component>
    </div>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, var(--violet-900), var(--violet-800) 45%, var(--violet-600));
  background-size: 200% 200%;
  animation: hero-pan 14s ease-in-out infinite alternate;
  color: #fff;
  text-align: center;
  padding: clamp(44px, 8vw, 88px) 20px clamp(56px, 9vw, 104px);
}

@keyframes hero-pan {
  from {
    background-position: 0% 0%;
  }
  to {
    background-position: 100% 100%;
  }
}

.hero-deco {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.deco {
  position: absolute;
  opacity: 0.3;
  filter: saturate(0.9);
  animation: float-y 6s ease-in-out infinite alternate;
}

@media (max-width: 600px) {
  .deco:nth-child(n + 5) {
    display: none;
  }
}

.hero h1,
.hero p {
  position: relative;
}

.hero h1 {
  font-size: clamp(2rem, 6vw, 3.4rem);
  margin-bottom: 8px;
}

.hero p {
  margin: 0 auto;
  max-width: 34em;
  opacity: 0.9;
  font-size: clamp(1rem, 2vw, 1.2rem);
}

.page {
  margin-top: -28px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 16px;
}

.game-card {
  display: block;
  background: var(--surface);
  border-radius: var(--radius-m);
  box-shadow: var(--shadow-s);
  padding: 18px;
  color: inherit;
  text-decoration: none;
  transition:
    transform var(--t-fast) var(--ease-pop),
    box-shadow var(--t-fast);
}

a.game-card:hover {
  transform: translateY(-5px) scale(1.015);
  box-shadow: var(--shadow-l);
}

a.game-card:hover .emoji {
  animation: wiggle 450ms var(--ease-pop);
}

.game-card h2 {
  font-size: 1.15rem;
  margin: 6px 0;
}

.emoji {
  font-size: 2rem;
  display: inline-block;
}

.status {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 800;
  border-radius: 999px;
  padding: 3px 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.status.live {
  background: #e3f4e8;
  color: var(--success);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.status.live::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--success);
  animation: pulse-soft 1.8s ease-in-out infinite;
}

.status.soon {
  background: var(--violet-050);
  color: var(--ink-soft);
}

.locked {
  opacity: 0.72;
}

.locked .emoji {
  filter: grayscale(0.6);
}

.tags {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0;
  margin: 12px 0 0;
}

.tags li {
  font-size: 0.75rem;
  color: var(--ink-soft);
  background: var(--bg);
  border-radius: 999px;
  padding: 3px 9px;
}
</style>
