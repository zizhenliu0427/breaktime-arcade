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
</script>

<template>
  <div class="hero">
    <h1 class="rise">Breaktime Arcade</h1>
    <p class="rise" style="animation-delay: 60ms">
      Quick party games for the classroom, made for phones, tablets and computers.
    </p>
  </div>

  <div class="page">
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
  background: linear-gradient(160deg, var(--violet-800), var(--violet-600));
  color: #fff;
  text-align: center;
  padding: 44px 20px 52px;
}

.hero h1 {
  font-size: clamp(2rem, 6vw, 3rem);
  margin-bottom: 8px;
}

.hero p {
  margin: 0 auto;
  max-width: 34em;
  opacity: 0.9;
  font-size: 1.05rem;
}

.page {
  margin-top: -28px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 14px;
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
  transform: translateY(-4px);
  box-shadow: var(--shadow-m);
}

.game-card h2 {
  font-size: 1.15rem;
  margin: 6px 0;
}

.emoji {
  font-size: 2rem;
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
