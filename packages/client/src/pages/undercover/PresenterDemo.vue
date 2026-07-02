<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseButton from '../../components/ui/BaseButton.vue';
import TimerRing from '../../components/ui/TimerRing.vue';

const { t } = useI18n();

interface DemoPlayer {
  name: string;
  role: 'civilian' | 'undercover';
  word: string;
  alive: boolean;
  clue: string;
}

const civilianWord = computed(() => t('demo.civWord'));
const undercoverWord = computed(() => t('demo.ucWord'));

const players = computed<DemoPlayer[]>(() => [
  { name: 'Alice', role: 'civilian', word: civilianWord.value, alive: true, clue: t('demo.players.aliceClue') },
  { name: 'Bob', role: 'civilian', word: civilianWord.value, alive: true, clue: t('demo.players.bobClue') },
  { name: 'Charlie', role: 'undercover', word: undercoverWord.value, alive: true, clue: t('demo.players.charlieClue') },
  { name: 'Daisy', role: 'civilian', word: civilianWord.value, alive: true, clue: t('demo.players.daisyClue') },
  { name: 'Ethan', role: 'civilian', word: civilianWord.value, alive: true, clue: t('demo.players.ethanClue') },
]);

const step = ref(0);

const steps = computed(() => [
  { id: 'intro', title: t('demo.stepTitles.intro'), emoji: '🕵️' },
  { id: 'deal', title: t('demo.stepTitles.deal'), emoji: '🃏' },
  { id: 'clue', title: t('demo.stepTitles.clue'), emoji: '🎤' },
  { id: 'discuss', title: t('demo.stepTitles.discuss'), emoji: '💬' },
  { id: 'vote', title: t('demo.stepTitles.vote'), emoji: '🗳️' },
  { id: 'reveal', title: t('demo.stepTitles.reveal'), emoji: '🔍' },
  { id: 'win', title: t('demo.stepTitles.win'), emoji: '🏆' },
]);

const currentStep = computed(() => steps.value[step.value]!);
const isFirst = computed(() => step.value === 0);
const isLast = computed(() => step.value === steps.value.length - 1);

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
        <h1>{{ t('demo.title') }}</h1>
        <p class="lead">{{ t('demo.leadIntro') }}</p>
        <div class="card rule-card">
          <ul class="rules">
            <li v-html="t('demo.introRules.rule1')" />
            <li v-html="t('demo.introRules.rule2')" />
            <li v-html="t('demo.introRules.rule3')" />
            <li v-html="t('demo.introRules.rule4')" />
            <li v-html="t('demo.introRules.rule5')" />
          </ul>
        </div>
        <p class="example-note">{{ t('demo.introTip') }}</p>
      </section>

      <!-- DEAL -->
      <section v-else-if="currentStep.id === 'deal'" key="deal" class="stage pop">
        <div class="stage-emoji">🃏</div>
        <h1>{{ t('demo.stepTitles.deal') }}</h1>
        <p class="lead">{{ t('demo.dealSubtitle') }}</p>
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
                {{ p.role === 'undercover' ? t('demo.dealRoleUndercover') : t('demo.dealRoleCivilian') }}
              </span>
            </div>
          </div>
        </div>
        <div class="demo-note" v-html="t('demo.dealNote')"></div>
      </section>

      <!-- CLUE -->
      <section v-else-if="currentStep.id === 'clue'" key="clue" class="stage pop">
        <div class="stage-emoji">🎤</div>
        <h1>{{ t('demo.stepTitles.clue') }}</h1>
        <p class="lead">{{ t('demo.clueSubtitle') }}</p>
        <div class="clue-list">
          <div v-for="(p, i) in players" :key="p.name" class="clue-row" :class="{ undercover: p.role === 'undercover' }">
            <span class="clue-num">{{ i + 1 }}</span>
            <span class="clue-name">{{ p.name }}</span>
            <span class="clue-text">{{ p.clue }}</span>
            <span class="clue-word">{{ p.word }}</span>
          </div>
        </div>
        <div class="demo-note" v-html="t('demo.clueNote')"></div>
      </section>

      <!-- DISCUSS -->
      <section v-else-if="currentStep.id === 'discuss'" key="discuss" class="stage pop">
        <div class="stage-emoji">💬</div>
        <h1>{{ t('demo.stepTitles.discuss') }}</h1>
        <p class="lead">{{ t('demo.discussSubtitle') }}</p>
        <div class="discuss-demo">
          <TimerRing :remaining="32" :total="45" :size="130" />
        </div>
        <div class="card speech-bubbles">
          <div class="bubble b-left">
            <strong>Alice:</strong> {{ t('demo.discussSpeech.alice') }}
          </div>
          <div class="bubble b-right">
            <strong>Charlie:</strong> {{ t('demo.discussSpeech.charlie') }}
          </div>
          <div class="bubble b-left">
            <strong>Bob:</strong> {{ t('demo.discussSpeech.bob') }}
          </div>
        </div>
        <p class="discuss-tip">{{ t('demo.discussTip') }}</p>
      </section>

      <!-- VOTE -->
      <section v-else-if="currentStep.id === 'vote'" key="vote" class="stage pop">
        <div class="stage-emoji">🗳️</div>
        <h1>{{ t('demo.stepTitles.vote') }}</h1>
        <p class="lead">{{ t('demo.voteSubtitle') }}</p>
        <div class="vote-grid">
          <div v-for="p in players" :key="p.name" class="vote-row">
            <span class="vr-name">{{ p.name }}</span>
            <span class="vr-arrow">→</span>
            <span class="vr-target" :class="{ 'vote-hit': (p.name !== 'Charlie' && p.name !== 'Ethan') ? true : false }">
              {{ p.name === 'Charlie' ? 'Alice' : p.name === 'Ethan' ? 'Bob' : 'Charlie' }}
            </span>
          </div>
        </div>
        <div class="vote-result card" v-html="t('demo.voteResult')"></div>
        <p class="vote-tip">{{ t('demo.voteTip') }}</p>
      </section>

      <!-- REVEAL -->
      <section v-else-if="currentStep.id === 'reveal'" key="reveal" class="stage pop">
        <div class="stage-emoji">🔍</div>
        <h1>{{ t('demo.stepTitles.reveal') }}</h1>
        <p class="lead">{{ t('demo.revealSubtitle') }}</p>
        <div class="reveal-card card">
          <div class="reveal-flip">
            <span class="face-icon">🕵️</span>
          </div>
          <h2>{{ t('demo.revealWinner') }}</h2>
          <p>{{ t('demo.revealDetails') }}</p>
          <div class="word-pair">
            <div class="wp civ-box">
              <span class="wp-label">{{ t('game.civilianWord') }}</span>
              <span class="wp-value">{{ civilianWord }}</span>
            </div>
            <div class="wp uc-box">
              <span class="wp-label">{{ t('game.undercoverWord') }}</span>
              <span class="wp-value">{{ undercoverWord }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- WIN -->
      <section v-else-if="currentStep.id === 'win'" key="win" class="stage pop">
        <div class="stage-emoji">🏆</div>
        <h1>{{ t('demo.winTitle') }}</h1>
        <div class="win-grid">
          <div class="card win-card civ-win">
            <div class="wc-emoji">😇</div>
            <h2>{{ t('demo.winCivTitle') }}</h2>
            <p>{{ t('demo.winCivDesc') }}</p>
          </div>
          <div class="card win-card uc-win">
            <div class="wc-emoji">🕵️</div>
            <h2>{{ t('demo.winUcTitle') }}</h2>
            <p>{{ t('demo.winUcDesc') }}</p>
          </div>
        </div>
        <div class="card tip-card">
          <h3>{{ t('demo.tipsTitle') }}</h3>
          <ul class="tips">
            <li><strong>{{ t('demo.tipsList.tip1').split(':')[0] }}:</strong>{{ t('demo.tipsList.tip1').substring(t('demo.tipsList.tip1').indexOf(':') + 1) }}</li>
            <li><strong>{{ t('demo.tipsList.tip2').split(':')[0] }}:</strong>{{ t('demo.tipsList.tip2').substring(t('demo.tipsList.tip2').indexOf(':') + 1) }}</li>
            <li><strong>{{ t('demo.tipsList.tip3').split(':')[0] }}:</strong>{{ t('demo.tipsList.tip3').substring(t('demo.tipsList.tip3').indexOf(':') + 1) }}</li>
          </ul>
        </div>
        <div class="final-actions">
          <router-link to="/undercover/host">
            <BaseButton variant="accent" size="lg">{{ t('undercover.hostRoom') }}</BaseButton>
          </router-link>
          <router-link to="/undercover/pass-and-play">
            <BaseButton variant="primary" size="lg">{{ t('undercover.passPlay') }}</BaseButton>
          </router-link>
        </div>
      </section>
    </Transition>

    <!-- Navigation -->
    <div class="nav-bar rise" style="animation-delay: 200ms">
      <BaseButton v-if="!isFirst" variant="ghost" @click="prev">{{ t('demo.backBtn') }}</BaseButton>
      <span v-else />
      <span class="nav-counter">{{ step + 1 }} / {{ steps.length }}</span>
      <BaseButton v-if="!isLast" variant="accent" @click="next">{{ t('demo.nextBtn') }}</BaseButton>
      <BaseButton v-else variant="primary" @click="restart">{{ t('demo.restartBtn') }}</BaseButton>
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
