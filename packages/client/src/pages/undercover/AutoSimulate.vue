<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  createGame,
  confirmReveal,
  nextSpeaker,
  startVoting,
  castVote,
  resolveVotes,
  nextRound,
  eligibleVoters,
  eligibleTargets,
  tallyVotes,
  getWordPack,
  randomPair,
  wordPacks,
  type LocalGame,
  type LocalPlayer,
  type Role,
} from '@arcade/shared';
import BaseButton from '../../components/ui/BaseButton.vue';

const { t } = useI18n();

/* ── Setup form ─────────────────────────────── */
const stage = ref<'setup' | 'running'>('setup');
const playerCount = ref(6);
const undercoverCount = ref(1);
const includeMrWhite = ref(false);
const packId = ref('en-easy');
const speed = ref(1); // 0.5 | 1 | 2 | 4
const speeds = [0.5, 1, 2, 4];

const maxUndercover = computed(() => Math.max(1, Math.floor((playerCount.value - 1) / 2)));

/** Cosmetic bot names, cycled to the chosen player count. */
const BOT_NAMES = [
  'Alice', 'Bob', 'Charlie', 'Daisy', 'Ethan', 'Fiona',
  'George', 'Hana', 'Ivan', 'Julia', 'Kev', 'Lena',
];

/* ── Live game state ────────────────────────── */
const game = ref<LocalGame | null>(null);
const playing = ref(false);
const discussTicks = ref(0);
const DISCUSS_TICKS = 5;
let timer: ReturnType<typeof setTimeout> | null = null;

interface LogEntry {
  id: number;
  text: string;
  kind: 'phase' | 'clue' | 'vote' | 'elim' | 'win';
}
const log = ref<LogEntry[]>([]);
let logSeq = 0;
function pushLog(text: string, kind: LogEntry['kind']) {
  log.value.unshift({ id: logSeq++, text, kind });
  if (log.value.length > 60) log.value.pop();
}

/* ── Derived view helpers ───────────────────── */
const players = computed<LocalPlayer[]>(() => game.value?.players ?? []);
const phase = computed(() => game.value?.phase ?? null);
const round = computed(() => game.value?.round ?? 1);

const speakerOrder = computed<string[]>(() => {
  const g = game.value;
  if (!g) return [];
  return g.phase === 'runoff' && g.runoffCandidates ? g.runoffCandidates : g.speakingOrder;
});
const currentSpeakerId = computed<string | null>(() => {
  const g = game.value;
  if (!g || (g.phase !== 'clue' && g.phase !== 'runoff')) return null;
  return speakerOrder.value[g.speakerIndex] ?? null;
});

const voteCounts = computed<Record<string, number>>(() => {
  const g = game.value;
  if (!g) return {};
  return tallyVotes(g.votes).counts;
});
/** voterId -> targetId for the current ballot (for arrows). */
const currentVotes = computed<Record<string, string>>(() => game.value?.votes ?? {});

const phaseLabel = computed(() => {
  switch (phase.value) {
    case 'clue': return t('game.cluePhase');
    case 'discuss': return t('game.discussPhase');
    case 'vote': return t('game.votePhase');
    case 'runoff': return t('game.runoffPhase');
    case 'elimination': return t('game.eliminationPhase');
    case 'ended': return t('game.endedPhase');
    default: return '';
  }
});

const winnerLabel = computed(() => {
  switch (game.value?.winner) {
    case 'civilians': return t('game.civiliansWin');
    case 'undercover': return t('game.undercoverWins');
    case 'mrWhite': return t('game.mrWhiteWins');
    default: return '';
  }
});

function roleLabel(role: Role): string {
  return role === 'undercover' ? t('game.undercover')
    : role === 'mrWhite' ? t('game.mrWhite')
    : t('game.civilian');
}
function playerName(id: string): string {
  return players.value.find((p) => p.id === id)?.name ?? id;
}

/* ── Bot decision making ────────────────────── */
function botVote(g: LocalGame, voterId: string): string {
  const targets = eligibleTargets(g, voterId).filter((id) => id !== voterId);
  const voter = g.players.find((p) => p.id === voterId)!;
  const impostors = targets.filter((id) => {
    const p = g.players.find((pp) => pp.id === id)!;
    return p.role === 'undercover' || p.role === 'mrWhite';
  });
  const civilians = targets.filter((id) => !impostors.includes(id));

  let pool: string[];
  if (voter.role === 'undercover' || voter.role === 'mrWhite') {
    pool = civilians.length ? civilians : targets;
  } else if (impostors.length && Math.random() < 0.55) {
    pool = impostors; // civilians are suspicious of an impostor a bit more than half the time
  } else {
    pool = targets;
  }
  if (!pool.length) pool = eligibleTargets(g, voterId); // fallback (may include self)
  return pool[Math.floor(Math.random() * pool.length)]!;
}

/* ── Simulation stepping ────────────────────── */
function clueStep() {
  const g = game.value!;
  const speaker = currentSpeakerId.value;
  if (speaker) pushLog(t('sim.log.clue', { name: playerName(speaker) }), 'clue');
  const before = g.phase;
  const ng = nextSpeaker(g);
  game.value = ng;
  if (before === 'clue' && ng.phase === 'discuss') {
    pushLog(t('sim.log.discussStart'), 'phase');
    discussTicks.value = DISCUSS_TICKS;
  }
  if (before === 'runoff' && ng.phase === 'vote') {
    pushLog(t('sim.log.revote'), 'phase');
  }
}

function voteStep() {
  const g = game.value!;
  const nextVoter = eligibleVoters(g).find((id) => g.votes[id] === undefined);
  if (nextVoter) {
    const target = botVote(g, nextVoter);
    game.value = castVote(g, nextVoter, target);
    pushLog(t('sim.log.vote', { voter: playerName(nextVoter), target: playerName(target) }), 'vote');
    return;
  }
  // Ballot complete → resolve.
  const resolved = resolveVotes(g);
  game.value = resolved;
  if (resolved.phase === 'runoff') {
    pushLog(t('sim.log.tie'), 'elim');
  } else if (resolved.phase === 'elimination') {
    if (resolved.lastElimination) {
      const p = resolved.players.find((pp) => pp.id === resolved.lastElimination!.playerId)!;
      pushLog(t('sim.log.eliminated', { name: p.name, role: roleLabel(p.role) }), 'elim');
    } else {
      pushLog(t('sim.log.nobody'), 'elim');
    }
  } else if (resolved.phase === 'ended') {
    announceWin(resolved);
  }
}

function eliminationStep() {
  const g = game.value!;
  const ng = nextRound(g);
  game.value = ng;
  if (ng.phase === 'ended') {
    announceWin(ng);
  } else {
    pushLog(t('sim.log.roundStart', { n: ng.round }), 'phase');
  }
}

function announceWin(g: LocalGame) {
  const label = g.winner === 'civilians' ? t('game.civiliansWin')
    : g.winner === 'undercover' ? t('game.undercoverWins')
    : t('game.mrWhiteWins');
  pushLog(label, 'win');
  playing.value = false;
}

/** One meaningful micro-step of the simulation. */
function tick() {
  const g = game.value;
  if (!g) return;
  switch (g.phase) {
    case 'clue':
    case 'runoff':
      clueStep();
      break;
    case 'discuss':
      if (discussTicks.value > 0) {
        discussTicks.value -= 1;
      } else {
        game.value = startVoting(g);
        pushLog(t('sim.log.voteStart'), 'phase');
      }
      break;
    case 'vote':
      voteStep();
      break;
    case 'elimination':
      eliminationStep();
      break;
    case 'ended':
      playing.value = false;
      break;
  }
}

/* ── Auto-play loop ─────────────────────────── */
function scheduleNext() {
  if (timer) clearTimeout(timer);
  if (!playing.value) return;
  const base = 900;
  timer = setTimeout(() => {
    tick();
    if (game.value?.phase === 'ended') {
      playing.value = false;
      return;
    }
    scheduleNext();
  }, base / speed.value);
}

function play() {
  if (game.value?.phase === 'ended') return;
  playing.value = true;
  scheduleNext();
}
function pause() {
  playing.value = false;
  if (timer) clearTimeout(timer);
}
function togglePlay() {
  playing.value ? pause() : play();
}
function manualStep() {
  pause();
  const g = game.value;
  if (!g) return;
  // On a manual step, skip straight through the discuss countdown.
  if (g.phase === 'discuss') {
    game.value = startVoting(g);
    pushLog(t('sim.log.voteStart'), 'phase');
    return;
  }
  tick();
}

/* ── Lifecycle ──────────────────────────────── */
function fastForwardReveals(g: LocalGame): LocalGame {
  let cur = g;
  let guard = 0;
  while (cur.phase === 'reveal' && guard++ < 50) {
    cur = confirmReveal(cur);
  }
  return cur;
}

function startSimulation() {
  const pack = getWordPack(packId.value) ?? getWordPack('en-easy')!;
  const pair = randomPair(pack);
  const names = Array.from({ length: playerCount.value }, (_, i) => BOT_NAMES[i % BOT_NAMES.length]!);
  const uc = Math.min(undercoverCount.value, maxUndercover.value);
  let g = createGame({
    playerNames: names,
    wordPair: pair,
    undercoverCount: uc,
    includeMrWhite: includeMrWhite.value,
    discussSeconds: 45,
    voteSeconds: 20,
  });
  g = fastForwardReveals(g);
  game.value = g;
  log.value = [];
  logSeq = 0;
  pushLog(t('sim.log.deal', { n: playerCount.value }), 'phase');
  pushLog(t('sim.log.roundStart', { n: 1 }), 'phase');
  stage.value = 'running';
  play();
}

function restart() {
  pause();
  startSimulation();
}
function backToSetup() {
  pause();
  game.value = null;
  stage.value = 'setup';
}

onUnmounted(() => {
  if (timer) clearTimeout(timer);
});
</script>

<template>
  <div class="page page--wide sim">
    <!-- ── SETUP ─────────────────────────────── -->
    <template v-if="stage === 'setup'">
      <h1 class="rise">🤖 {{ t('sim.title') }}</h1>
      <p class="sub rise" style="animation-delay: 50ms">{{ t('sim.subtitle') }}</p>

      <div class="card setup-card rise" style="animation-delay: 90ms">
        <label class="field">
          <span class="field-label">{{ t('sim.players') }}: <strong>{{ playerCount }}</strong></span>
          <input v-model.number="playerCount" type="range" min="4" max="10" step="1" />
        </label>

        <label class="field">
          <span class="field-label">{{ t('sim.undercovers') }}: <strong>{{ Math.min(undercoverCount, maxUndercover) }}</strong></span>
          <input v-model.number="undercoverCount" type="range" min="1" :max="maxUndercover" step="1" />
        </label>

        <label class="field field-row">
          <input v-model="includeMrWhite" type="checkbox" />
          <span class="field-label">{{ t('sim.includeMrWhite') }}</span>
        </label>

        <div class="field">
          <span class="field-label">{{ t('sim.wordPack') }}</span>
          <div class="packs">
            <button
              v-for="pack in wordPacks"
              :key="pack.id"
              type="button"
              class="pack"
              :class="{ active: packId === pack.id }"
              @click="packId = pack.id"
            >
              {{ pack.difficulty === 'easy' ? t('passPlay.easy') : t('passPlay.medium') }}
            </button>
          </div>
        </div>

        <BaseButton variant="accent" size="lg" block @click="startSimulation">
          {{ t('sim.start') }}
        </BaseButton>
      </div>
      <p class="godview-note rise" style="animation-delay: 130ms">💡 {{ t('sim.godViewNote') }}</p>
    </template>

    <!-- ── RUNNING ───────────────────────────── -->
    <template v-else>
      <div class="status-bar">
        <div class="status-left">
          <span class="round-pill">{{ t('sim.round', { n: round }) }}</span>
          <span class="phase-pill">{{ phaseLabel }}</span>
        </div>
        <span v-if="phase === 'discuss'" class="discuss-count">⏳ {{ discussTicks }}</span>
      </div>

      <!-- Winner banner -->
      <Transition name="pop">
        <div v-if="phase === 'ended'" class="win-banner card">🏆 {{ winnerLabel }}</div>
      </Transition>

      <!-- God-view player grid -->
      <div class="grid">
        <div
          v-for="p in players"
          :key="p.id"
          class="pcard"
          :class="{
            dead: !p.alive,
            uc: p.role === 'undercover',
            mw: p.role === 'mrWhite',
            speaking: p.id === currentSpeakerId,
          }"
        >
          <div class="pc-top">
            <span class="pc-name">{{ p.name }}</span>
            <span v-if="p.id === currentSpeakerId" class="mic">🎤</span>
            <span v-else-if="!p.alive" class="skull">💀</span>
          </div>
          <div class="pc-word">{{ p.word ?? '—' }}</div>
          <div class="pc-role">
            <span class="tag" :class="p.role">{{ roleLabel(p.role) }}</span>
          </div>
          <div v-if="(phase === 'vote' || phase === 'runoff') && currentVotes[p.id]" class="pc-vote">
            → {{ playerName(currentVotes[p.id]!) }}
          </div>
          <div v-if="(phase === 'vote') && voteCounts[p.id]" class="pc-tally">
            {{ '🔴'.repeat(voteCounts[p.id]!) }}
          </div>
        </div>
      </div>

      <!-- Controls -->
      <div class="controls card">
        <BaseButton variant="accent" @click="togglePlay" :disabled="phase === 'ended'">
          {{ playing ? t('sim.pause') : t('sim.play') }}
        </BaseButton>
        <BaseButton variant="primary" @click="manualStep" :disabled="phase === 'ended'">
          {{ t('sim.step') }}
        </BaseButton>
        <div class="speed">
          <span class="speed-label">{{ t('sim.speed') }}</span>
          <button
            v-for="s in speeds"
            :key="s"
            type="button"
            class="speed-btn"
            :class="{ active: speed === s }"
            @click="speed = s"
          >{{ s }}×</button>
        </div>
        <BaseButton variant="ghost" @click="restart">{{ t('sim.restart') }}</BaseButton>
        <BaseButton variant="ghost" @click="backToSetup">{{ t('sim.backToSetup') }}</BaseButton>
      </div>

      <!-- Narration log -->
      <div class="log card">
        <h3>{{ t('sim.logTitle') }}</h3>
        <TransitionGroup name="logfade" tag="ul">
          <li v-for="entry in log" :key="entry.id" :class="`log-${entry.kind}`">{{ entry.text }}</li>
        </TransitionGroup>
      </div>
    </template>
  </div>
</template>

<style scoped>
.sim {
  max-width: 960px;
}

.sub {
  color: var(--ink-soft);
  margin-bottom: 22px;
}

/* ── Setup ──────────────────────────────────── */
.setup-card {
  display: grid;
  gap: 20px;
  max-width: 520px;
}

.field {
  display: grid;
  gap: 8px;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.field-label {
  font-weight: 700;
  color: var(--ink);
}

input[type='range'] {
  width: 100%;
  accent-color: var(--violet-600);
}

input[type='checkbox'] {
  width: 20px;
  height: 20px;
  accent-color: var(--violet-600);
}

.packs {
  display: flex;
  gap: 10px;
}

.pack {
  flex: 1;
  padding: 12px;
  border-radius: var(--radius-m);
  box-shadow: inset 0 0 0 2px var(--line);
  background: var(--surface);
  font-weight: 700;
  transition: box-shadow var(--t-fast), background var(--t-fast);
}

.pack.active {
  box-shadow: inset 0 0 0 3px var(--violet-600);
  background: var(--violet-050);
}

.godview-note {
  color: var(--ink-soft);
  font-size: 0.9rem;
  margin-top: 16px;
  max-width: 520px;
}

/* ── Status bar ─────────────────────────────── */
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 8px;
}

.status-left {
  display: flex;
  gap: 8px;
}

.round-pill,
.phase-pill {
  font-weight: 800;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 0.9rem;
}

.round-pill {
  background: var(--violet-100);
  color: var(--violet-800);
}

.phase-pill {
  background: var(--violet-600);
  color: #fff;
}

.discuss-count {
  font-weight: 800;
  font-size: 1.1rem;
  color: var(--violet-700);
}

.win-banner {
  text-align: center;
  font-size: 1.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--violet-050), #fff);
  margin-bottom: 14px;
  padding: 20px;
}

/* ── Grid ───────────────────────────────────── */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.pcard {
  background: var(--surface);
  border-radius: var(--radius-m);
  box-shadow: var(--shadow-s);
  padding: 12px;
  display: grid;
  gap: 5px;
  border-top: 4px solid var(--success);
  transition: transform var(--t-fast) var(--ease-pop), box-shadow var(--t-fast), opacity var(--t-fast);
}

.pcard.uc {
  border-top-color: var(--danger);
}

.pcard.mw {
  border-top-color: #8a5b00;
}

.pcard.speaking {
  box-shadow: 0 0 0 3px var(--violet-600), var(--shadow-m);
  transform: translateY(-3px);
}

.pcard.dead {
  opacity: 0.45;
  filter: grayscale(0.6);
}

.pc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pc-name {
  font-weight: 800;
}

.pc-word {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--violet-700);
}

.tag {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-radius: 999px;
  padding: 2px 8px;
  display: inline-block;
}

.tag.civilian {
  background: #e3f4e8;
  color: var(--success);
}

.tag.undercover {
  background: #fde9ec;
  color: var(--danger);
}

.tag.mrWhite {
  background: #fdf1dc;
  color: #8a5b00;
}

.pc-vote {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--ink-soft);
}

.pc-tally {
  font-size: 0.72rem;
  letter-spacing: 1px;
}

/* ── Controls ───────────────────────────────── */
.controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.speed {
  display: flex;
  align-items: center;
  gap: 4px;
}

.speed-label {
  font-weight: 700;
  color: var(--ink-soft);
  font-size: 0.85rem;
  margin-right: 4px;
}

.speed-btn {
  padding: 6px 10px;
  border-radius: var(--radius-s);
  box-shadow: inset 0 0 0 2px var(--line);
  background: var(--surface);
  font-weight: 700;
  font-size: 0.82rem;
}

.speed-btn.active {
  box-shadow: inset 0 0 0 2px var(--violet-600);
  background: var(--violet-050);
  color: var(--violet-800);
}

/* ── Log ────────────────────────────────────── */
.log h3 {
  font-size: 0.95rem;
  margin: 0 0 10px;
}

.log ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 4px;
  max-height: 240px;
  overflow-y: auto;
}

.log li {
  font-size: 0.88rem;
  padding: 6px 10px;
  border-radius: var(--radius-s);
  background: var(--violet-050);
}

.log-phase { color: var(--violet-800); font-weight: 700; }
.log-clue { background: transparent; color: var(--ink-soft); }
.log-vote { background: transparent; color: var(--ink); }
.log-elim { background: #fde9ec; color: #7c1120; font-weight: 700; }
.log-win { background: #e3f4e8; color: #14532d; font-weight: 800; }

/* ── Transitions ────────────────────────────── */
.pop-enter-active { transition: transform var(--t-med) var(--ease-pop), opacity var(--t-med); }
.pop-enter-from { transform: scale(0.8); opacity: 0; }

.logfade-enter-active { transition: opacity var(--t-med), transform var(--t-med) var(--ease-pop); }
.logfade-enter-from { opacity: 0; transform: translateX(-10px); }
</style>
