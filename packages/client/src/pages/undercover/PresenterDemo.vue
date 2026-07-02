<script setup lang="ts">
import { ref, computed } from 'vue';
import BaseButton from '../../components/ui/BaseButton.vue';
import TimerRing from '../../components/ui/TimerRing.vue';

/**
 * Presenter Demo — a projector-friendly, step-by-step walkthrough of
 * Who's Undercover? using fake example players. Everything is revealed
 * openly so the audience learns the mechanics. No real game state runs.
 */

interface DemoPlayer {
  name: string;
  role: 'civilian' | 'undercover';
  word: string;
  alive: boolean;
  clue: string;
}

const civilianWord = 'Train';
const undercoverWord = 'Tram';

const players = ref<DemoPlayer[]>([
  { name: 'Alice', role: 'civilian', word: civilianWord, alive: true, clue: '"It runs on a schedule and stops at stations."' },
  { name: 'Bob', role: 'civilian', word: civilianWord, alive: true, clue: '"I take it to work every morning — long distance."' },
  { name: 'Charlie', role: 'undercover', word: undercoverWord, alive: true, clue: '"You can see it going through the city streets."' },
  { name: 'Daisy', role: 'civilian', word: civilianWord, alive: true, clue: '"It has carriages and a driver at the front."' },
  { name: 'Ethan', role: 'civilian', word: civilianWord, alive: true, clue: '"You buy a ticket from a machine at the platform."' },
]);

const step = ref(0);

const steps = [
  { id: 'intro', title: 'The Game', emoji: '🕵️' },
  { id: 'deal', title: 'Deal Words', emoji: '🃏' },
  { id: 'clue', title: 'Give Clues', emoji: '🎤' },
  { id: 'discuss', title: 'Discuss', emoji: '💬' },
  { id: 'vote', title: 'Vote', emoji: '🗳️' },
  { id: 'reveal', title: 'Reveal', emoji: '🔍' },
  { id: 'win', title: 'Who Wins?', emoji: '🏆' },
];

const currentStep = computed(() => steps[step.value]!);
const isFirst = computed(() => step.value === 0);
const isLast = computed(() => step.value === steps.length - 1);

function next() {
  if (!isLast.value) step.value++;
}
function prev() {
  if (!isFirst.value) step.value--;
}
function restart() {
  step.value = 0;
}
</script>

<template>
  <div class="page page--wide demo">
    <!-- Progress bar -->
    <div class="stepper rise">
      <button
        v-for="(s, i) in steps"
        :key="s.id"
        type="button"
        class="step-dot"
        :class="{ active: i === step, done: i < step }"
        :title="s.title"
        @click="step = i"
      >
        <span class="dot-emoji">{{ s.emoji }}</span>
      </button>
      <div class="step-track">
        <div class="step-fill" :style="{ width: `${(step / (steps.length - 1)) * 100}%` }" />
      </div>
    </div>

    <Transition name="slide" mode="out-in">
      <!-- INTRO -->
      <section v-if="currentStep.id === 'intro'" key="intro" class="stage pop">
        <div class="stage-emoji">🕵️</div>
        <h1>Who's Undercover?</h1>
        <p class="lead">A social deduction word game for 4–10 players.</p>
        <div class="card rule-card">
          <ul class="rules">
            <li>Everyone receives a <strong>secret word</strong>.</li>
            <li>Most players get the <strong>same word</strong> — they are <span class="tag civ">Civilians</span>.</li>
            <li>One player gets a <strong>similar but different word</strong> — they are the <span class="tag uc">Undercover</span>.</li>
            <li><strong>Nobody knows</strong> which word is which, or who has what.</li>
            <li>The goal: <span class="tag civ">Civilians</span> try to find the <span class="tag uc">Undercover</span>. The <span class="tag uc">Undercover</span> tries to blend in.</li>
          </ul>
        </div>
        <p class="example-note">Let's walk through one round with 5 example players.</p>
      </section>

      <!-- DEAL -->
      <section v-else-if="currentStep.id === 'deal'" key="deal" class="stage pop">
        <div class="stage-emoji">🃏</div>
        <h1>Step 1 · Deal Words</h1>
        <p class="lead">Each player secretly receives a word. In a real game, only you can see your own word.</p>
        <div class="player-grid">
          <div
            v-for="p in players"
            :key="p.name"
            class="player-card"
            :class="{ undercover: p.role === 'undercover' }"
          >
            <div class="pc-name">{{ p.name }}</div>
            <div class="pc-word">{{ p.word }}</div>
            <div class="pc-role">
              <span :class="p.role === 'undercover' ? 'tag uc' : 'tag civ'">
                {{ p.role === 'undercover' ? '🕵️ Undercover' : '😇 Civilian' }}
              </span>
            </div>
          </div>
        </div>
        <div class="demo-note">
          <strong>📽️ Demo mode:</strong> Everything is revealed openly. In the real game, each player only sees
          their own word — nobody knows if they are the Undercover!
        </div>
      </section>

      <!-- CLUE -->
      <section v-else-if="currentStep.id === 'clue'" key="clue" class="stage pop">
        <div class="stage-emoji">🎤</div>
        <h1>Step 2 · Give Clues</h1>
        <p class="lead">Players take turns giving <strong>one short clue</strong> about their word. You must not say the word, spell it, or give its first letter.</p>
        <div class="clue-list">
          <div v-for="(p, i) in players" :key="p.name" class="clue-row" :class="{ undercover: p.role === 'undercover' }">
            <span class="clue-num">{{ i + 1 }}</span>
            <span class="clue-name">{{ p.name }}</span>
            <span class="clue-text">{{ p.clue }}</span>
            <span class="clue-word">{{ p.word }}</span>
          </div>
        </div>
        <div class="demo-note">
          🤔 Notice how Charlie's clue says <em>"city streets"</em> — that's because his word is <strong>Tram</strong>,
          not Train. Small differences like this are what players listen for!
        </div>
      </section>

      <!-- DISCUSS -->
      <section v-else-if="currentStep.id === 'discuss'" key="discuss" class="stage pop">
        <div class="stage-emoji">💬</div>
        <h1>Step 3 · Discuss</h1>
        <p class="lead">Players have <strong>45 seconds</strong> to talk about whose clue felt suspicious.</p>
        <div class="discuss-demo">
          <TimerRing :remaining="32" :total="45" :size="130" />
        </div>
        <div class="card speech-bubbles">
          <div class="bubble b-left">
            <strong>Alice:</strong> "Charlie mentioned streets — trains don't really go on streets, do they?"
          </div>
          <div class="bubble b-right">
            <strong>Charlie:</strong> "Well, some trains go through city areas… I was thinking of urban lines."
          </div>
          <div class="bubble b-left">
            <strong>Bob:</strong> "Hmm, that's a stretch. I'm suspicious."
          </div>
        </div>
        <p class="discuss-tip">💡 The Undercover must be careful — their clue needs to fit in without being too vague or too specific!</p>
      </section>

      <!-- VOTE -->
      <section v-else-if="currentStep.id === 'vote'" key="vote" class="stage pop">
        <div class="stage-emoji">🗳️</div>
        <h1>Step 4 · Vote</h1>
        <p class="lead">Everyone votes for who they think is the Undercover. The player with the most votes is out.</p>
        <div class="vote-grid">
          <div v-for="p in players" :key="p.name" class="vote-row">
            <span class="vr-name">{{ p.name }}</span>
            <span class="vr-arrow">→</span>
            <span class="vr-target" :class="{ 'vote-hit': (p.name !== 'Charlie' && p.name !== 'Ethan') ? true : false }">
              {{ p.name === 'Charlie' ? 'Alice' : p.name === 'Ethan' ? 'Bob' : 'Charlie' }}
            </span>
          </div>
        </div>
        <div class="vote-result card">
          <strong>Result:</strong> Charlie received <strong>3 votes</strong> — the most.
          Charlie is eliminated!
        </div>
        <p class="vote-tip">💡 If it's a tie, the tied players give one more clue each, then the others revote.</p>
      </section>

      <!-- REVEAL -->
      <section v-else-if="currentStep.id === 'reveal'" key="reveal" class="stage pop">
        <div class="stage-emoji">🔍</div>
        <h1>Step 5 · Reveal</h1>
        <p class="lead">The eliminated player's <strong>role</strong> is shown — but their word stays hidden until the game ends.</p>
        <div class="reveal-card card">
          <div class="reveal-flip">
            <span class="face-icon">🕵️</span>
          </div>
          <h2>Charlie was the <span class="tag uc">Undercover</span>!</h2>
          <p>The Civilians correctly identified the Undercover. The words are now revealed to everyone:</p>
          <div class="word-pair">
            <div class="wp civ-box">
              <span class="wp-label">Civilian word</span>
              <span class="wp-value">{{ civilianWord }}</span>
            </div>
            <div class="wp uc-box">
              <span class="wp-label">Undercover word</span>
              <span class="wp-value">{{ undercoverWord }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- WIN -->
      <section v-else-if="currentStep.id === 'win'" key="win" class="stage pop">
        <div class="stage-emoji">🏆</div>
        <h1>Who Wins?</h1>
        <div class="win-grid">
          <div class="card win-card civ-win">
            <div class="wc-emoji">😇</div>
            <h2>Civilians win</h2>
            <p>Vote out the Undercover before it's too late.</p>
          </div>
          <div class="card win-card uc-win">
            <div class="wc-emoji">🕵️</div>
            <h2>Undercover wins</h2>
            <p>Survive until only one Civilian is left. Blend in!</p>
          </div>
        </div>
        <div class="card tip-card">
          <h3>🎯 Tips for the class</h3>
          <ul class="tips">
            <li><strong>Civilians:</strong> Give clues specific enough that teammates recognise the word — but vague enough that the Undercover can't guess it.</li>
            <li><strong>Undercover:</strong> Listen carefully and match the others' clue style. Don't be too specific or too vague.</li>
            <li><strong>Everyone:</strong> Pay attention to who says something slightly off!</li>
          </ul>
        </div>
        <div class="final-actions">
          <router-link to="/undercover/host">
            <BaseButton variant="accent" size="lg">Host a Live Room</BaseButton>
          </router-link>
          <router-link to="/undercover/pass-and-play">
            <BaseButton variant="primary" size="lg">Pass &amp; Play</BaseButton>
          </router-link>
        </div>
      </section>
    </Transition>

    <!-- Navigation -->
    <div class="nav-bar rise" style="animation-delay: 200ms">
      <BaseButton v-if="!isFirst" variant="ghost" @click="prev">← Back</BaseButton>
      <span v-else />
      <span class="nav-counter">{{ step + 1 }} / {{ steps.length }}</span>
      <BaseButton v-if="!isLast" variant="accent" @click="next">Next →</BaseButton>
      <BaseButton v-else variant="primary" @click="restart">🔄 Restart</BaseButton>
    </div>
  </div>
</template>

<style scoped>
/* ── Layout ─────────────────────────────── */
.demo {
  max-width: 900px;
}

.stage {
  text-align: center;
  min-height: 300px;
}

.stage-emoji {
  font-size: 3rem;
  margin-bottom: 8px;
}

.stage h1 {
  font-size: clamp(1.5rem, 4vw, 2rem);
  margin-bottom: 10px;
}

.lead {
  color: var(--ink-soft);
  font-size: 1.05rem;
  max-width: 36em;
  margin: 0 auto 20px;
}

/* ── Stepper ────────────────────────────── */
.stepper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: 28px;
  position: relative;
  padding: 0 8px;
}

.step-dot {
  position: relative;
  z-index: 2;
  background: var(--surface);
  border-radius: 999px;
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  box-shadow: var(--shadow-s);
  transition: transform var(--t-fast) var(--ease-pop), box-shadow var(--t-fast);
  flex-shrink: 0;
}

.step-dot:hover {
  transform: scale(1.1);
}

.step-dot.active {
  box-shadow: 0 0 0 3px var(--violet-600), var(--shadow-m);
  transform: scale(1.12);
}

.step-dot.done {
  background: var(--violet-100);
}

.dot-emoji {
  font-size: 1.15rem;
}

.step-track {
  position: absolute;
  left: 28px;
  right: 28px;
  top: 50%;
  height: 4px;
  background: var(--line);
  border-radius: 2px;
  z-index: 1;
}

.step-fill {
  height: 100%;
  background: var(--violet-600);
  border-radius: 2px;
  transition: width var(--t-med) var(--ease-soft);
}

/* ── Intro ──────────────────────────────── */
.rule-card {
  text-align: left;
  max-width: 600px;
  margin: 0 auto;
}

.rules {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}

.rules li {
  padding-left: 24px;
  position: relative;
}

.rules li::before {
  content: '•';
  position: absolute;
  left: 8px;
  color: var(--violet-600);
  font-weight: 800;
}

.tag {
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-radius: 999px;
  padding: 2px 8px;
  display: inline-block;
}

.tag.civ {
  background: #e3f4e8;
  color: var(--success);
}

.tag.uc {
  background: #fde9ec;
  color: var(--danger);
}

.example-note {
  color: var(--ink-soft);
  font-weight: 700;
  margin-top: 18px;
}

/* ── Deal ───────────────────────────────── */
.player-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.player-card {
  background: var(--surface);
  border-radius: var(--radius-m);
  box-shadow: var(--shadow-s);
  padding: 16px 12px;
  display: grid;
  gap: 6px;
  text-align: center;
  border-top: 4px solid var(--success);
  transition: transform var(--t-fast) var(--ease-pop);
}

.player-card:hover {
  transform: translateY(-3px);
}

.player-card.undercover {
  border-top-color: var(--danger);
}

.pc-name {
  font-weight: 800;
  font-size: 1.05rem;
}

.pc-word {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--violet-700);
}

.pc-role {
  margin-top: 2px;
}

.demo-note {
  background: #fdf1dc;
  color: #8a5b00;
  font-weight: 600;
  border-radius: var(--radius-s);
  padding: 12px 16px;
  font-size: 0.9rem;
  text-align: left;
}

/* ── Clue ───────────────────────────────── */
.clue-list {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
  max-width: 650px;
  margin-left: auto;
  margin-right: auto;
}

.clue-row {
  display: grid;
  grid-template-columns: 32px 80px 1fr auto;
  align-items: center;
  gap: 10px;
  background: var(--surface);
  border-radius: var(--radius-m);
  box-shadow: var(--shadow-s);
  padding: 12px 14px;
  text-align: left;
}

.clue-row.undercover {
  box-shadow: 0 0 0 2px var(--danger), var(--shadow-s);
}

.clue-num {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--violet-100);
  color: var(--violet-800);
  font-weight: 800;
  font-size: 0.85rem;
  display: grid;
  place-items: center;
}

.clue-name {
  font-weight: 800;
}

.clue-text {
  font-style: italic;
  color: var(--ink-soft);
  font-size: 0.92rem;
}

.clue-word {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--violet-700);
  background: var(--violet-050);
  border-radius: 999px;
  padding: 2px 8px;
}

@media (max-width: 600px) {
  .clue-row {
    grid-template-columns: 28px 1fr;
    gap: 6px;
  }
  .clue-word {
    grid-column: 1 / -1;
  }
}

/* ── Discuss ────────────────────────────── */
.discuss-demo {
  display: grid;
  place-items: center;
  margin-bottom: 16px;
}

.speech-bubbles {
  text-align: left;
  display: grid;
  gap: 12px;
  max-width: 540px;
  margin: 0 auto 16px;
}

.bubble {
  padding: 12px 16px;
  border-radius: var(--radius-m);
  background: var(--violet-050);
  font-size: 0.92rem;
  position: relative;
}

.b-left {
  margin-right: 30px;
}

.b-right {
  margin-left: 30px;
  background: #fdf1dc;
}

.discuss-tip {
  color: var(--ink-soft);
  font-size: 0.9rem;
  font-weight: 600;
}

/* ── Vote ───────────────────────────────── */
.vote-grid {
  display: grid;
  gap: 8px;
  max-width: 400px;
  margin: 0 auto 16px;
}

.vote-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface);
  border-radius: var(--radius-m);
  box-shadow: var(--shadow-s);
  padding: 10px 16px;
}

.vr-name {
  font-weight: 800;
  min-width: 70px;
}

.vr-arrow {
  color: var(--ink-soft);
}

.vr-target {
  font-weight: 700;
}

.vr-target.vote-hit {
  color: var(--danger);
  font-weight: 800;
}

.vote-result {
  max-width: 400px;
  margin: 0 auto 12px;
  background: #fde9ec;
  color: #7c1120;
  text-align: left;
}

.vote-tip {
  color: var(--ink-soft);
  font-size: 0.9rem;
  font-weight: 600;
}

/* ── Reveal ─────────────────────────────── */
.reveal-card {
  max-width: 480px;
  margin: 0 auto;
}

.reveal-flip {
  width: 80px;
  height: 80px;
  margin: 0 auto 12px;
  display: grid;
  place-items: center;
  background: #fde9ec;
  border-radius: var(--radius-m);
  box-shadow: var(--shadow-m);
}

.face-icon {
  font-size: 2.5rem;
}

.reveal-card h2 {
  font-size: 1.3rem;
}

.word-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 16px;
}

.wp {
  border-radius: var(--radius-m);
  padding: 14px 10px;
  display: grid;
  gap: 4px;
}

.wp-label {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.75;
}

.wp-value {
  font-size: 1.2rem;
  font-weight: 800;
}

.civ-box {
  background: #e8f1fd;
  color: #143a75;
}

.uc-box {
  background: #fde9ec;
  color: #7c1120;
}

/* ── Win ────────────────────────────────── */
.win-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 20px;
}

@media (max-width: 500px) {
  .win-grid {
    grid-template-columns: 1fr;
  }
}

.win-card {
  text-align: center;
  padding: 24px 16px;
}

.win-card h2 {
  font-size: 1.1rem;
  margin: 6px 0 4px;
}

.win-card p {
  margin: 0;
  color: var(--ink-soft);
  font-size: 0.9rem;
}

.wc-emoji {
  font-size: 2.2rem;
}

.civ-win {
  border-top: 4px solid var(--success);
}

.uc-win {
  border-top: 4px solid var(--danger);
}

.tip-card {
  text-align: left;
  margin-bottom: 24px;
}

.tip-card h3 {
  font-size: 1rem;
  margin: 0 0 10px;
}

.tips {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
  font-size: 0.92rem;
}

.final-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.final-actions a {
  text-decoration: none;
}

/* ── Nav bar ────────────────────────────── */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 28px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.nav-counter {
  font-weight: 700;
  color: var(--ink-soft);
  font-size: 0.88rem;
}

/* ── Slide transition ───────────────────── */
.slide-enter-active,
.slide-leave-active {
  transition: opacity var(--t-med), transform var(--t-med) var(--ease-pop);
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
