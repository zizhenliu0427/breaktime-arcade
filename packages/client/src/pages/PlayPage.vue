<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import BaseButton from '../components/ui/BaseButton.vue';
import TimerRing from '../components/ui/TimerRing.vue';
import { useOnlinePlayerStore } from '../stores/onlinePlayer';
import { useCountdown } from '../lib/useCountdown';

const player = useOnlinePlayerStore();
const router = useRouter();

// A direct visit or a phone refresh has no in-memory room — resume a stored
// session, otherwise there's nothing to play and we send the user home.
onMounted(async () => {
  if (!player.room) {
    const ok = await player.rejoin();
    if (!ok) router.replace('/');
  }
});

const phaseEndsAt = computed(() => player.phaseEndsAt);
const { seconds } = useCountdown(phaseEndsAt);
const discussTotal = computed(() => player.room?.config.discussSeconds ?? 45);
const voteTotal = computed(() => player.room?.config.voteSeconds ?? 20);
const ringTotal = computed(() => (player.phase === 'vote' ? voteTotal.value : discussTotal.value));
const remaining = computed(() => seconds.value ?? ringTotal.value);

const groups = computed(() => (player.room ? Object.values(player.room.groups) : []));
const capacity = computed(() => player.room?.config.groupSize ?? 6);
const aliveLabel = computed(() => {
  if (!player.room) return '';
  if (player.mode === 'team') {
    const n = Object.values(player.room.groups).filter((g) => g.alive).length;
    return `${n} teams in`;
  }
  return `${player.groupMembers.filter((p) => p.alive).length} in`;
});
const revealReady = computed(() => player.myGroup?.readyMemberIds.length ?? 0);
const revealTotal = computed(() => player.myGroup?.playerCount ?? 0);
const voteLabel = computed(() => (player.mode === 'team' ? 'teams' : 'players'));

function roleLabel(role: string): string {
  if (player.mode === 'team') {
    return role === 'undercover' ? 'the undercover team' : role === 'mrWhite' ? 'Mr White' : 'a civilian team';
  }
  return role === 'undercover' ? 'the Undercover' : role === 'mrWhite' ? 'Mr White' : 'a Civilian';
}

// Hold-to-reveal card (the word hides the instant you let go).
const holding = ref(false);
// Local vote selection; cleared each round so a new ballot starts fresh.
const choice = ref<string | null>(null);
watch(() => player.phase, () => {
  choice.value = null;
});

function pickGroup(id: string | null) {
  void player.pickGroup(id);
}

function confirmVote() {
  if (!choice.value) return;
  const target = choice.value;
  choice.value = null;
  void player.vote(target);
}

function leave() {
  if (window.confirm("Leave this room? You'll need the room code to rejoin.")) {
    player.leave();
    router.push('/');
  }
}

const confetti = Array.from({ length: 36 }, (_, i) => {
  const colours = ['#e0344a', '#2e6fe0', '#f5a623', '#2fa24b', '#6f3bd4'];
  return {
    id: i,
    style: {
      left: `${(i * 97) % 100}%`,
      background: colours[i % colours.length],
      animationDelay: `${(i % 10) * 0.09}s`,
      animationDuration: `${2 + (i % 5) * 0.4}s`,
      transform: `rotate(${(i * 47) % 360}deg)`,
    },
  };
});
</script>

<template>
  <div class="page game">
    <div v-if="player.closedReason" class="stage closed rise">
      <h2>Session ended</h2>
      <p>{{ player.closedReason }}</p>
      <BaseButton variant="primary" @click="router.push('/')">Back to home</BaseButton>
    </div>

    <template v-else>
      <div v-if="player.myGroup" class="statusbar">
        <span class="pill">Team {{ player.myGroup.name }}</span>
        <span v-if="player.room?.started && player.phase !== 'reveal'" class="pill">Round {{ player.round }}</span>
        <span class="alive">{{ aliveLabel }}</span>
        <button class="quit" type="button" @click="leave">Leave</button>
      </div>

      <p v-if="player.error" class="error" role="alert">{{ player.error }}</p>

      <Transition name="phase" mode="out-in">
        <!-- connecting / syncing -->
        <section v-if="!player.me" key="loading" class="loading">Connecting to your room…</section>

        <!-- lobby: pick a team -->
        <section v-else-if="player.me.groupId === null" key="lobby" class="stage lobby pop">
          <h2>Welcome, {{ player.name }}!</h2>
          <p class="sub">Pick your team, or let us balance the teams for you.</p>
          <div class="group-grid">
            <button
              v-for="g in groups"
              :key="g.id"
              type="button"
              class="group-pick"
              :class="[`g-${g.id.toLowerCase()}`, { full: g.playerCount >= capacity }]"
              :disabled="g.playerCount >= capacity"
              @click="pickGroup(g.id)"
            >
              <span class="gp-name">{{ g.name }}</span>
              <span class="gp-count">{{ g.playerCount }}/{{ capacity }}</span>
              <span v-if="g.playerCount >= capacity" class="gp-full">Full</span>
            </button>
          </div>
          <BaseButton variant="ghost" block @click="pickGroup(null)">Assign me to a team</BaseButton>
        </section>

        <!-- reveal: hold to see the word (team: shared; groups: your own) -->
        <section v-else-if="player.phase === 'reveal'" key="reveal" class="stage reveal pop">
          <template v-if="player.secret">
            <p class="who">Your secret word — for your eyes only.</p>
            <button
              class="word-card"
              :class="{ holding }"
              type="button"
              @pointerdown.prevent="holding = true"
              @pointerup="holding = false"
              @pointerleave="holding = false"
              @pointercancel="holding = false"
              @contextmenu.prevent
            >
              <span v-if="holding" class="word pop">
                {{ player.secret.word ?? 'You have NO word — you are Mr White. Blend in!' }}
              </span>
              <span v-else class="prompt">
                <span class="eye" aria-hidden="true">👁️</span>
                Press and hold to reveal
              </span>
            </button>
            <p class="hint">Your word hides again the moment you let go.</p>
            <BaseButton
              variant="primary"
              size="lg"
              block
              :disabled="player.iHaveMemorised"
              @click="player.ready()"
            >
              {{ player.iHaveMemorised ? 'Waiting for everyone…' : "I've memorised my word" }}
            </BaseButton>
            <p class="progress">🔐 {{ revealReady }}/{{ revealTotal }} ready in your team</p>
          </template>
          <p v-else class="loading">Dealing words…</p>
        </section>

        <!-- clue / runoff -->
        <section v-else-if="player.phase === 'clue' || player.phase === 'runoff'" :key="player.phase" class="stage clue pop">
          <div v-if="player.isRunoffVote" class="banner" role="status">
            ⚖️ It's a tie! The tied {{ voteLabel }} give one more clue each.
          </div>
          <h2>
            {{ player.isRunoffVote ? 'Tie-break clues' : `Round ${player.round} · Clues` }}
          </h2>
          <p v-if="player.isMyTurn" class="sub">
            🎤 It's your turn. Give one short clue — don't say the word, spell it or give its first letter.
          </p>
          <p v-else class="sub">Take turns giving one short clue about the word.</p>

          <ol class="order">
            <li
              v-for="(s, i) in player.speakOrder"
              :key="s.id"
              class="speaker"
              :class="{
                current: player.room?.config.mode === 'team'
                  ? player.room.currentSpeakerGroupId === s.id
                  : player.myGroup?.currentSpeakerId === s.id,
                done: i < (player.room?.config.mode === 'team' ? player.room.speakerIndex : player.myGroup?.speakerIndex ?? 0),
              }"
            >
              <span class="num">{{ i + 1 }}</span>
              <span class="name">{{ s.name }}<span v-if="s.id === player.playerId"> (you)</span></span>
              <span
                v-if="(player.mode === 'team' ? player.room?.currentSpeakerGroupId : player.myGroup?.currentSpeakerId) === s.id"
                class="now"
              >{{ player.isMyTurn ? 'Your turn' : 'Speaking' }}</span>
              <span
                v-else-if="i < (player.mode === 'team' ? player.room?.speakerIndex ?? 0 : player.myGroup?.speakerIndex ?? 0)"
                class="tick"
                aria-label="done"
              >✓</span>
            </li>
          </ol>

          <BaseButton v-if="player.isMyTurn" variant="accent" size="lg" block @click="player.clueDone()">
            I'm done — next
          </BaseButton>
          <p v-else class="waiting">Wait for your turn.</p>
        </section>

        <!-- discuss -->
        <section v-else-if="player.phase === 'discuss'" key="discuss" class="stage discuss pop">
          <h2>💬 Discuss</h2>
          <p class="sub">Who gave a suspicious clue? Talk it over — voting opens when the timer ends.</p>
          <div class="ring">
            <TimerRing :remaining="remaining" :total="ringTotal" :size="150" />
          </div>
        </section>

        <!-- vote -->
        <section v-else-if="player.phase === 'vote'" key="vote" class="stage vote pop">
          <div v-if="player.isRunoffVote" class="banner" role="status">
            Tie-break revote — choose between the tied {{ voteLabel }} only.
          </div>
          <h2>🗳️ Cast your vote</h2>
          <template v-if="player.canIVote">
            <p class="sub">
              Who do you think is the undercover? {{ player.mode === 'team' ? 'The first teammate to vote locks your team’s choice.' : 'Your vote stays secret.' }}
            </p>
            <div class="targets" role="radiogroup" aria-label="Vote">
              <button
                v-for="t in player.voteTargets"
                :key="t.id"
                type="button"
                class="target"
                role="radio"
                :aria-checked="choice === t.id"
                :class="{ chosen: choice === t.id }"
                @click="choice = choice === t.id ? null : t.id"
              >
                <span class="target-name">{{ t.name }}</span>
                <span v-if="choice === t.id" class="check pop">✓</span>
              </button>
            </div>
            <BaseButton variant="accent" size="lg" block :disabled="!choice" @click="confirmVote">
              Confirm vote
            </BaseButton>
          </template>
          <div v-else class="voted">
            <p class="progress">🗳 {{ player.votesIn }}/{{ player.votersTotal }} {{ voteLabel }} voted</p>
            <p class="waiting">
              {{
                player.myVote
                  ? `Voted for ${player.nameOf(player.myVote)}.`
                  : player.myAlive
                    ? 'Waiting for the others…'
                    : "You're out — watching the vote."
              }}
            </p>
          </div>
        </section>

        <!-- elimination -->
        <section v-else-if="player.phase === 'elimination'" key="elimination" class="stage elim pop">
          <template v-if="player.eliminated">
            <div class="flip-card" aria-hidden="true">
              <div class="flip-inner">
                <span class="face front">🗳️</span>
                <span class="face back">{{ player.eliminated.role === 'civilian' ? '😇' : '🕵️' }}</span>
              </div>
            </div>
            <h2>{{ player.nameOf(player.eliminated.id) }} received the most votes.</h2>
            <p class="role-line">
              {{ player.nameOf(player.eliminated.id) }} was <strong>{{ roleLabel(player.eliminated.role) }}</strong>.
            </p>
            <p class="note">Their word stays hidden until the game ends.</p>
          </template>
          <template v-else>
            <div class="tie" aria-hidden="true">🤝</div>
            <h2>Still tied!</h2>
            <p class="role-line">Nobody is eliminated this round.</p>
          </template>
          <BaseButton v-if="player.myAlive" variant="accent" size="lg" block @click="player.continueRound()">
            Next round
          </BaseButton>
          <p v-else class="note">Waiting to start the next round…</p>
        </section>

        <!-- ended -->
        <section v-else-if="player.phase === 'ended'" key="ended" class="stage ended-wrap pop">
          <div class="confetti" aria-hidden="true">
            <span v-for="c in confetti" :key="c.id" class="piece" :style="c.style" />
          </div>
          <div class="result">
            <div class="trophy" aria-hidden="true">{{ player.civiliansWin ? '😇' : '🕵️' }}</div>
            <h2>{{ player.civiliansWin ? 'The civilians win!' : 'The undercover wins!' }}</h2>
            <p v-if="player.undercoverId" class="reveal-line">
              The undercover {{ player.mode === 'team' ? 'team' : 'player' }} was
              <strong>{{ player.nameOf(player.undercoverId) }}</strong>.
            </p>
            <div class="words">
              <div class="word-box civ">
                <span class="label">Civilian word</span>
                <span class="value">{{ player.civilianWord ?? '—' }}</span>
              </div>
              <div class="word-box uc">
                <span class="label">Undercover word</span>
                <span class="value">{{ player.undercoverWord ?? '—' }}</span>
              </div>
            </div>
            <BaseButton variant="primary" block @click="leave">Leave room</BaseButton>
          </div>
        </section>

        <section v-else key="idle" class="loading">Waiting for the host to start the game…</section>
      </Transition>
    </template>
  </div>
</template>

<style scoped>
.game {
  max-width: 560px;
}

.statusbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ink-soft);
}

.pill {
  background: var(--violet-100);
  color: var(--violet-800);
  border-radius: 999px;
  padding: 3px 10px;
}

.alive {
  flex: 1;
}

.quit {
  background: none;
  color: var(--ink-soft);
  font-size: 0.82rem;
  font-weight: 700;
  text-decoration: underline;
  padding: 4px;
}

.error {
  color: var(--danger);
  font-weight: 700;
  margin-bottom: 12px;
}

.loading {
  text-align: center;
  color: var(--ink-soft);
  padding: 40px 0;
}

/* ── Lobby ─────────────────────────────────── */
.lobby h2 {
  font-size: 1.3rem;
}

.lobby .sub {
  color: var(--ink-soft);
  margin-bottom: 18px;
}

.group-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.group-pick {
  border: none;
  border-top: 5px solid var(--line);
  border-radius: var(--radius-m);
  background: var(--surface);
  box-shadow: var(--shadow-s);
  padding: 20px 12px;
  display: grid;
  gap: 4px;
  justify-items: center;
  cursor: pointer;
  transition: transform var(--t-fast) var(--ease-pop), box-shadow var(--t-fast);
}

.group-pick:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: var(--shadow-m);
}

.group-pick:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.g-a { border-top-color: var(--group-a); }
.g-b { border-top-color: var(--group-b); }
.g-c { border-top-color: var(--group-c); }
.g-d { border-top-color: var(--group-d); }
.g-e { border-top-color: var(--violet-600); }
.g-f { border-top-color: var(--violet-700); }

.gp-name {
  font-weight: 800;
  font-size: 1.1rem;
}

.gp-count {
  color: var(--ink-soft);
  font-weight: 700;
}

.gp-full {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--danger);
}

/* ── Reveal (hold to see the word) ──────────── */
.reveal {
  text-align: center;
}

.who {
  font-weight: 700;
  margin-bottom: 14px;
}

.word-card {
  width: 100%;
  min-height: 180px;
  border-radius: var(--radius-l);
  background: var(--surface);
  box-shadow: var(--shadow-m);
  display: grid;
  place-items: center;
  padding: 24px;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  transition: background var(--t-fast), transform var(--t-fast) var(--ease-pop);
}

.word-card.holding {
  background: var(--violet-800);
  transform: scale(1.02);
}

.prompt {
  color: var(--ink-soft);
  font-weight: 700;
  display: grid;
  gap: 6px;
  justify-items: center;
}

.eye {
  font-size: 1.8rem;
}

.word {
  color: #fff;
  font-size: clamp(1.7rem, 8vw, 2.6rem);
  font-weight: 800;
  overflow-wrap: anywhere;
}

.hint {
  color: var(--ink-soft);
  font-size: 0.85rem;
  margin: 12px 0 18px;
}

/* ── Clue ───────────────────────────────────── */
.clue h2,
.discuss h2,
.vote h2 {
  font-size: 1.25rem;
}

.sub {
  color: var(--ink-soft);
  font-size: 0.92rem;
  margin-bottom: 16px;
}

.banner {
  background: #fdf1dc;
  color: #8a5b00;
  font-weight: 700;
  border-radius: var(--radius-s);
  padding: 10px 14px;
  margin-bottom: 14px;
}

.order {
  list-style: none;
  padding: 0;
  margin: 0 0 20px;
  display: grid;
  gap: 8px;
}

.speaker {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--surface);
  border-radius: var(--radius-m);
  padding: 12px 14px;
  box-shadow: var(--shadow-s);
  transition: transform var(--t-med) var(--ease-pop), box-shadow var(--t-med);
}

.speaker.current {
  transform: scale(1.03);
  box-shadow: 0 0 0 3px var(--violet-600), var(--shadow-m);
}

.speaker.done {
  opacity: 0.55;
}

.num {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: var(--violet-100);
  color: var(--violet-800);
  font-weight: 800;
  font-size: 0.85rem;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.current .num {
  background: var(--violet-700);
  color: #fff;
}

.name {
  font-weight: 700;
  flex: 1;
}

.now {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--violet-700);
  animation: now-pulse 1.4s ease-in-out infinite;
}

@keyframes now-pulse {
  50% {
    opacity: 0.45;
  }
}

.tick {
  color: var(--success);
  font-weight: 800;
}

.waiting {
  text-align: center;
  color: var(--ink-soft);
  font-weight: 700;
}

/* ── Discuss ────────────────────────────────── */
.discuss {
  text-align: center;
}

.ring {
  display: grid;
  place-items: center;
  margin-bottom: 8px;
}

/* ── Vote ───────────────────────────────────── */
.targets {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 20px;
}

.target {
  position: relative;
  background: var(--surface);
  border-radius: var(--radius-m);
  box-shadow: var(--shadow-s);
  padding: 18px 12px;
  font-weight: 800;
  transition: transform var(--t-fast) var(--ease-pop), box-shadow var(--t-fast);
}

.target:active {
  transform: translateY(2px);
}

.target.chosen {
  box-shadow: 0 0 0 3px var(--violet-600), var(--shadow-m);
  background: var(--violet-050);
}

.target-name {
  display: block;
  font-size: 1.02rem;
}

.check {
  position: absolute;
  top: -8px;
  right: -6px;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: var(--success);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 0.9rem;
  box-shadow: var(--shadow-s);
}

.voted {
  text-align: center;
}

.progress {
  font-weight: 800;
  color: var(--violet-700);
  margin: 0 0 6px;
}

/* ── Elimination ────────────────────────────── */
.elim {
  text-align: center;
}

.flip-card {
  width: 96px;
  height: 96px;
  margin: 0 auto 16px;
  perspective: 500px;
}

.flip-inner {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  animation: flip 900ms var(--ease-pop) 250ms both;
}

@keyframes flip {
  from {
    transform: rotateY(0);
  }
  to {
    transform: rotateY(180deg);
  }
}

.face {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 3rem;
  background: var(--surface);
  border-radius: var(--radius-m);
  box-shadow: var(--shadow-m);
  backface-visibility: hidden;
}

.face.back {
  transform: rotateY(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .flip-inner {
    animation: none;
    transform: rotateY(180deg);
  }
  .now {
    animation: none;
  }
}

.tie {
  font-size: 3rem;
  margin-bottom: 10px;
}

.role-line {
  font-size: 1.05rem;
  margin-bottom: 6px;
}

.note {
  color: var(--ink-soft);
  font-size: 0.88rem;
  margin-bottom: 22px;
}

/* ── Ended ──────────────────────────────────── */
.ended-wrap {
  position: relative;
}

.confetti {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 1;
}

.piece {
  position: absolute;
  top: -14px;
  width: 10px;
  height: 14px;
  border-radius: 2px;
  animation: fall linear both;
}

@keyframes fall {
  to {
    transform: translateY(105vh) rotate(540deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .piece {
    display: none;
  }
}

.result {
  position: relative;
  z-index: 2;
  text-align: center;
  background: var(--surface);
  border-radius: var(--radius-l);
  box-shadow: var(--shadow-m);
  padding: 30px 22px;
}

.trophy {
  font-size: 3rem;
  margin-bottom: 8px;
}

.reveal-line {
  margin-bottom: 20px;
}

.words {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 22px;
}

.word-box {
  border-radius: var(--radius-m);
  padding: 14px 10px;
  display: grid;
  gap: 2px;
}

.word-box .label {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.75;
}

.word-box .value {
  font-size: 1.15rem;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.word-box.civ {
  background: #e8f1fd;
  color: #143a75;
}

.word-box.uc {
  background: #fde9ec;
  color: #7c1120;
}

/* ── Closed ─────────────────────────────────── */
.closed {
  text-align: center;
}

/* ── Phase transition ── */
.phase-enter-active,
.phase-leave-active {
  transition: opacity var(--t-med), transform var(--t-med) var(--ease-pop);
}

.phase-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.phase-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
