<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BaseButton from '../components/ui/BaseButton.vue';
import TimerRing from '../components/ui/TimerRing.vue';
import { useOnlinePlayerStore } from '../stores/onlinePlayer';
import { useCountdown } from '../lib/useCountdown';

const { t } = useI18n();
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
// Solo play (groupSize 1): each "group" is one player — talk about players, not teams.
const isSolo = computed(() => player.mode === 'team' && (player.room?.config.groupSize ?? 0) === 1);
const aliveLabel = computed(() => {
  if (!player.room) return '';
  if (player.mode === 'team') {
    const n = Object.values(player.room.groups).filter((g) => g.alive).length;
    return isSolo.value ? t('game.playersIn', { n }) : t('game.teamsIn', { n });
  }
  return t('game.playersIn', { n: player.groupMembers.filter((p) => p.alive).length });
});
const revealReady = computed(() => player.myGroup?.readyMemberIds.length ?? 0);
const revealTotal = computed(() => player.myGroup?.playerCount ?? 0);
const voteLabel = computed(() => (player.mode === 'team' && !isSolo.value ? t('game.vLabelTeams') : t('game.vLabelPlayers')));
// The label for "this seat is you". team mode: the team/group name; otherwise
// (groups mode or solo): the player's own name.
const mySeatLabel = computed(() => {
  if (player.mode === 'team' && !isSolo.value) return player.myGroup?.name ?? '';
  return player.name || '';
});
// In team mode a seat id is a groupId; in groups mode it's a playerId. The
// speak-order list reuses the same id space, so "is this seat me?" must check
// the right one.
function isMySeat(seatId: string): boolean {
  if (player.mode === 'team') return player.myGroup?.id === seatId;
  return player.playerId === seatId;
}

function roleLabel(role: string): string {
  if (player.mode === 'team' && !isSolo.value) {
    return role === 'undercover' ? t('game.roleUndercoverTeam') : role === 'mrWhite' ? t('game.roleMrWhiteTeam') : t('game.roleCivilianTeam');
  }
  return role === 'undercover' ? t('game.roleUndercoverPlayer') : role === 'mrWhite' ? t('game.roleMrWhitePlayer') : t('game.roleCivilianPlayer');
}

// Hold-to-reveal card (the word hides the instant you let go).
const holding = ref(false);
// Local vote selection; cleared each round so a new ballot starts fresh.
const choice = ref<string | null>(null);
watch(() => player.phase, () => {
  choice.value = null;
});

// Team switching: after auto/manual assignment, players in real-team modes can
// re-open the group picker until their game starts. Solo has nothing to pick.
const switchingTeam = ref(false);
const gameStartedForMe = computed(() =>
  player.mode === 'team' ? !!player.room?.started : player.myGroup?.phase != null,
);
const canPickTeam = computed(() => !isSolo.value && !gameStartedForMe.value);
const showLobby = computed(
  () => !!player.me && (player.me.groupId === null || switchingTeam.value),
);
watch(gameStartedForMe, (started) => {
  if (started) switchingTeam.value = false;
});

const isSelfVote = computed(() => {
  if (!choice.value) return false;
  return player.voteTargets.find((t) => t.id === choice.value)?.isSelf ?? false;
});

// Am I Mr White? The secret payload gives a null word for Mr White only.
const iAmMrWhite = computed(() => player.secret !== null && player.secret.word === null);
// Bad-guy side won (undercover or mrWhite winner). When the undercover wins,
// Mr White (same side) also wins; when Mr White is the last bad guy standing,
// the winner is reported as 'mrWhite'.
const badSideWon = computed(() => player.winner === 'undercover' || player.winner === 'mrWhite');
// Show "you also won" only when this player is Mr White and the bad side won.
const mrWhiteAlsoWon = computed(() => iAmMrWhite.value && badSideWon.value);

function pickGroup(id: string | null) {
  void player.pickGroup(id);
  switchingTeam.value = false;
}

function confirmVote() {
  if (!choice.value) return;
  if (isSelfVote.value) {
    if (!window.confirm(t('game.selfVoteWarning'))) return;
  }
  const target = choice.value;
  choice.value = null;
  void player.vote(target);
}

function leave() {
  if (window.confirm(t('game.confirmLeave'))) {
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
      <h2>{{ t('host.room.sessionEnded') }}</h2>
      <p>{{ player.closedReason }}</p>
      <BaseButton variant="primary" @click="router.push('/')">{{ t('game.backToMenu') }}</BaseButton>
    </div>

    <template v-else>
      <div v-if="player.myGroup" class="statusbar">
        <span v-if="!isSolo" class="pill">{{ t('game.teamPill', { name: player.myGroup.name }) }}</span>
        <span v-if="player.room?.started && player.phase !== 'reveal'" class="pill">{{ t('host.room.roundNum', { n: player.round }) }}</span>
        <span class="alive">{{ aliveLabel }}</span>
        <button v-if="canPickTeam && !switchingTeam" class="switch-team" type="button" @click="switchingTeam = true">{{ t('game.changeTeam') }}</button>
        <button class="quit" type="button" @click="leave">{{ t('player.leave') }}</button>
      </div>

      <p v-if="player.error" class="error" role="alert">{{ player.error }}</p>

      <Transition name="phase" mode="out-in">
        <!-- connecting / syncing -->
        <section v-if="!player.me" key="loading" class="loading">{{ t('game.connecting') }}</section>

        <!-- lobby: pick a team -->
        <section v-else-if="showLobby" key="lobby" class="stage lobby pop">
          <h2>{{ t('game.welcomeName', { name: player.name }) }}</h2>
          <p class="sub">{{ t('game.pickTeam') }}</p>
          <div class="group-grid">
            <button
              v-for="g in groups"
              :key="g.id"
              type="button"
              class="group-pick"
              :class="[`g-${g.id.toLowerCase()}`, { full: g.playerCount >= capacity && player.me.groupId !== g.id, current: player.me.groupId === g.id }]"
              :disabled="g.playerCount >= capacity && player.me.groupId !== g.id"
              @click="pickGroup(g.id)"
            >
              <span class="gp-name">{{ g.name }}</span>
              <span class="gp-count">{{ g.playerCount }}/{{ capacity }}</span>
              <span v-if="player.me.groupId === g.id" class="gp-full">{{ t('game.yourTeam') }}</span>
              <span v-else-if="g.playerCount >= capacity" class="gp-full">{{ t('game.full') }}</span>
            </button>
          </div>
          <BaseButton variant="ghost" block @click="pickGroup(null)">{{ t('game.assignTeam') }}</BaseButton>
          <BaseButton v-if="switchingTeam && player.me.groupId" variant="ghost" block @click="switchingTeam = false">{{ t('game.cancelSwitch') }}</BaseButton>
        </section>

        <!-- reveal: hold to see the word (team: shared; groups: your own) -->
        <section v-else-if="player.phase === 'reveal'" key="reveal" class="stage reveal pop">
          <template v-if="player.secret">
            <p class="who">
              <span v-if="mySeatLabel" class="seat-tag">{{ t('game.youAreSeat', { name: mySeatLabel }) }}</span>
              {{ t('game.secretWordOnly') }}
            </p>
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
                {{ player.secret.word ?? t('game.mrWhiteNoWord') }}
              </span>
              <span v-else class="prompt">
                <span class="eye" aria-hidden="true">👁️</span>
                {{ t('game.pressToReveal') }}
              </span>
            </button>
            <p class="hint">{{ t('game.hintHold') }}</p>
            <BaseButton
              variant="primary"
              size="lg"
              block
              :disabled="player.iHaveMemorised"
              @click="player.ready()"
            >
              {{ player.iHaveMemorised ? t('game.waitingForEveryone') : t('game.ready') }}
            </BaseButton>
            <p class="progress">{{ t('game.readyInTeam', { ready: revealReady, total: revealTotal }) }}</p>
          </template>
          <p v-else class="loading">{{ t('game.dealingWords') }}</p>
        </section>

        <!-- clue / runoff -->
        <section v-else-if="player.phase === 'clue' || player.phase === 'runoff'" :key="player.phase" class="stage clue pop">
          <div v-if="player.isRunoffVote" class="banner" role="status">
            {{ t('game.tieBanner', { vLabel: voteLabel }) }}
          </div>
          <h2>
            {{ player.isRunoffVote ? t('game.runoffTitle') : t('game.cluesTitle', { n: player.round }) }}
          </h2>
          <p v-if="player.isMyTurn" class="sub">
            {{ t('game.myTurnClue') }}
          </p>
          <p v-else class="sub">{{ t('game.otherTurnClue') }}</p>

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
              <span class="name">{{ s.name }}<span v-if="isMySeat(s.id)"> {{ t('game.you') }}</span></span>
              <span
                v-if="(player.mode === 'team' ? player.room?.currentSpeakerGroupId : player.myGroup?.currentSpeakerId) === s.id"
                class="now"
              >{{ player.isMyTurn ? t('game.yourTurnBtn') : t('game.speaking') }}</span>
              <span
                v-else-if="i < (player.mode === 'team' ? player.room?.speakerIndex ?? 0 : player.myGroup?.speakerIndex ?? 0)"
                class="tick"
                aria-label="done"
              >✓</span>
            </li>
          </ol>

          <BaseButton v-if="player.isMyTurn" variant="accent" size="lg" block @click="player.clueDone()">
            {{ t('game.doneNext') }}
          </BaseButton>
          <p v-else class="waiting">{{ t('game.waitYourTurn') }}</p>
        </section>

        <!-- discuss -->
        <section v-else-if="player.phase === 'discuss'" key="discuss" class="stage discuss pop">
          <h2>{{ t('game.discussTitle') }}</h2>
          <p class="sub">{{ t('game.discussDesc') }}</p>
          <div class="ring">
            <TimerRing :remaining="remaining" :total="ringTotal" :size="150" />
          </div>
        </section>

        <!-- vote -->
        <section v-else-if="player.phase === 'vote'" key="vote" class="stage vote pop">
          <div v-if="player.isRunoffVote" class="banner" role="status">
            {{ t('game.tieBreakRevote', { vLabel: voteLabel }) }}
          </div>
          <!-- prominent countdown -->
          <div class="ring vote-ring">
            <TimerRing :remaining="remaining" :total="ringTotal" :size="130" />
          </div>
          <h2>{{ t('game.castYourVote') }}</h2>
          <template v-if="player.canIVote">
            <p class="sub">
              {{ player.mode === 'team' && !isSolo ? t('game.whoIsUndercoverTeam') : t('game.whoIsUndercoverPlayer') }}
            </p>
            <div class="targets" role="radiogroup" aria-label="Vote">
              <button
                v-for="target in player.voteTargets"
                :key="target.id"
                type="button"
                class="target"
                role="radio"
                :aria-checked="choice === target.id"
                :class="{ chosen: choice === target.id, 'self-target': target.isSelf }"
                @click="choice = choice === target.id ? null : target.id"
              >
                <span class="target-name">{{ target.name }}<span v-if="target.isSelf" class="you-tag"> {{ t('game.you') }}</span></span>
                <span v-if="choice === target.id" class="check pop">✓</span>
              </button>
            </div>
            <div v-if="isSelfVote" class="self-warn" role="alert">
              {{ t('game.selfWarn') }}
            </div>
            <BaseButton variant="accent" size="lg" block :disabled="!choice" @click="confirmVote">
              {{ isSelfVote ? t('game.confirmSelfVote') : t('game.confirmVote') }}
            </BaseButton>
          </template>
          <div v-else class="voted">
            <p class="progress">🗳 {{ t('host.room.votedPlayers', { voted: player.votesIn, total: player.votersTotal }) }}</p>
            <p v-if="seconds !== null" class="vote-timer" :class="{ urgent: remaining <= 5 }">⏱ {{ remaining }}s</p>
            <p class="waiting">
              {{
                player.myVote
                  ? t('game.votedFor', { name: player.nameOf(player.myVote) })
                  : player.myAlive
                    ? t('game.waitingForEveryone')
                    : t('game.watchingVote')
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
            <h2>{{ t('game.eliminatedTitle', { name: player.nameOf(player.eliminated.id) }) }}</h2>
            <p class="role-line">
              {{ t('game.eliminatedWas', { name: player.nameOf(player.eliminated.id), role: roleLabel(player.eliminated.role) }) }}
            </p>
            <p class="note">{{ t('game.wordStaysHidden') }}</p>
          </template>
          <template v-else>
            <div class="tie" aria-hidden="true">🤝</div>
            <h2>{{ t('game.stillTied') }}</h2>
            <p class="role-line">{{ t('game.nobodyEliminated') }}</p>
          </template>
          <BaseButton v-if="player.myAlive" variant="accent" size="lg" block @click="player.continueRound()">
            {{ t('game.nextRound') }}
          </BaseButton>
          <p v-else class="note">{{ t('game.waitingNextRound') }}</p>
        </section>

        <!-- ended -->
        <section v-else-if="player.phase === 'ended'" key="ended" class="stage ended-wrap pop">
          <div class="confetti" aria-hidden="true">
            <span v-for="c in confetti" :key="c.id" class="piece" :style="c.style" />
          </div>
          <div class="result">
            <div class="trophy" aria-hidden="true">{{ player.civiliansWin ? '😇' : '🕵️' }}</div>
            <h2>{{ player.civiliansWin ? t('game.theCiviliansWin') : (player.mode === 'team' && !isSolo ? t('game.theUndercoverTeamWins') : t('game.theUndercoverWins')) }}</h2>
            <p v-if="player.undercoverId" class="reveal-line">
              {{ t('game.undercoverWas', { label: voteLabel, name: player.nameOf(player.undercoverId) }) }}
            </p>
            <p v-if="mrWhiteAlsoWon" class="mrwhite-win">{{ t('game.mrWhiteAlsoWon') }}</p>
            <div class="words">
              <div class="word-box civ">
                <span class="label">{{ t('game.civilianWord') }}</span>
                <span class="value">{{ player.civilianWord ?? '—' }}</span>
              </div>
              <div class="word-box uc">
                <span class="label">{{ t('game.undercoverWord') }}</span>
                <span class="value">{{ player.undercoverWord ?? '—' }}</span>
              </div>
            </div>
            <BaseButton variant="primary" block @click="leave">{{ t('game.leaveRoom') }}</BaseButton>
          </div>
        </section>

        <section v-else key="idle" class="stage idle pop">
          <p v-if="mySeatLabel" class="who">
            <span class="seat-tag">{{ t('game.youAreSeat', { name: mySeatLabel }) }}</span>
          </p>
          <p class="loading">{{ t('game.waitingForHost') }}</p>
        </section>
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

.switch-team {
  background: var(--violet-050);
  color: var(--violet-800);
  font-size: 0.82rem;
  font-weight: 700;
  border: none;
  border-radius: 999px;
  padding: 4px 12px;
  cursor: pointer;
  transition: background var(--t-fast);
}

.switch-team:hover {
  background: var(--violet-100);
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

.group-pick.current {
  box-shadow: 0 0 0 3px var(--violet-600), var(--shadow-m);
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

.seat-tag {
  display: inline-block;
  background: var(--violet-050);
  color: var(--violet-600);
  border-radius: var(--radius-s);
  padding: 3px 9px;
  margin-right: 8px;
  font-size: 0.88em;
  font-weight: 700;
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
.vote-ring {
  margin-bottom: 4px;
}

.vote-timer {
  font-size: 1.6rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  margin: 8px 0;
  color: var(--ink-soft);
}

.vote-timer.urgent {
  color: var(--danger);
  animation: pulse-soft 0.8s ease-in-out infinite;
}

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

.self-target {
  border: 2px dashed var(--accent);
}

.you-tag {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink-soft);
}

.self-warn {
  background: #fdf1dc;
  color: #8a5b00;
  font-weight: 700;
  border-radius: var(--radius-s);
  padding: 10px 14px;
  margin-bottom: 12px;
  font-size: 0.9rem;
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

.mrwhite-win {
  font-weight: 800;
  color: var(--accent-press);
  background: var(--violet-050);
  border-radius: var(--radius-s);
  padding: 8px 12px;
  margin: -8px 0 20px;
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
