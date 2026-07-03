<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import QRCode from 'qrcode';
import { useI18n } from 'vue-i18n';
import type { LocalPhase, PublicGroupState, Role } from '@arcade/shared';
import { GROUP_IDS, wordPacks } from '@arcade/shared';
import BaseButton from '../../components/ui/BaseButton.vue';
import { useOnlineHostStore } from '../../stores/onlineHost';

const { t } = useI18n();

const router = useRouter();
const host = useOnlineHostStore();

const qrDataUrl = ref('');
const answersRevealed = ref(false);
const settingsOpen = ref(false);
const now = ref(Date.now());
let tick: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  tick = setInterval(() => (now.value = Date.now()), 250);
  if (!host.room) {
    const ok = await host.reclaim();
    if (!ok) router.replace('/undercover/host');
  }
});
onUnmounted(() => {
  if (tick) clearInterval(tick);
});

watch(
  () => host.joinUrl,
  async (url) => {
    qrDataUrl.value = url
      ? await QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: '#2d0b5e' } })
      : '';
  },
  { immediate: true },
);

function phaseLabel(phase: LocalPhase | null): string {
  if (!phase) return t('host.room.groupWaiting');
  const map: Record<LocalPhase, string> = {
    reveal: t('host.room.phaseReveal'),
    clue: t('host.room.phaseClue'),
    discuss: t('host.room.phaseDiscuss'),
    vote: t('host.room.phaseVote'),
    runoff: t('host.room.phaseRunoff'),
    elimination: t('host.room.phaseElimination'),
    ended: t('host.room.phaseEnded'),
  };
  return map[phase] || phase;
}
function secondsLeft(ms: number | null): number | null {
  if (ms == null) return null;
  return Math.max(0, Math.ceil((ms - now.value) / 1000));
}
function memberName(id: string | null | undefined): string {
  return (id && host.playerById(id)?.name) || '—';
}
function roleLabel(role: Role | undefined): string {
  if (role === 'undercover') return t('host.room.roleUndercover');
  if (role === 'mrWhite') return t('host.room.roleMrWhite');
  return t('host.room.roleCivilian');
}
function winnerLabel(g: PublicGroupState): string {
  if (g.winner === 'civilians') return t('host.room.winCivilians');
  if (g.winner === 'undercover') return t('host.room.winUndercover');
  if (g.winner === 'mrWhite') return t('host.room.winMrWhite');
  return '';
}

const mode = computed(() => host.room?.config.mode);
// Solo play (groupSize 1): each "group" is one player — talk about players, not teams.
const isSolo = computed(() => mode.value === 'team' && host.room?.config.groupSize === 1);
const joinedCount = computed(() => host.room?.players.length ?? 0);
/** Live resize options (settings panel). Server clamps below the occupied-group floor. */
const liveCountOptions = computed(() => GROUP_IDS.map((_, i) => i + 1));
const liveSizeOptions = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const countLabel = computed(() => {
  if (isSolo.value) return t('host.setup.numPlayers');
  return mode.value === 'groups' ? t('host.setup.numGroups') : t('host.setup.numTeams');
});
const sizeLabel = computed(() => (mode.value === 'groups' ? t('host.setup.perGroup') : t('host.setup.perTeam')));
const canStart = computed(() => {
  const r = host.room;
  if (!r) return false;
  if (mode.value === 'team') {
    return !r.started && Object.values(r.groups).filter((g) => g.playerCount > 0).length >= 3;
  }
  return Object.values(r.groups).some((g) => g.playerCount >= 3 && g.phase === null);
});
const activeGroups = computed(() => (host.room ? Object.values(host.room.groups) : []));
const unassigned = computed(() => (host.room?.players ?? []).filter((p) => !p.groupId));
const readyTotal = computed(
  () => host.room && Object.values(host.room.groups).reduce((s, g) => s + g.readyMemberIds.length, 0),
);
const memTotal = computed(
  () => host.room && Object.values(host.room.groups).reduce((s, g) => s + g.playerCount, 0),
);

/** team mode: the group's role. */
function teamGroupRole(groupId: string): Role | undefined {
  return host.secrets && host.secrets.kind === 'team' ? host.secrets.roles[groupId] : undefined;
}
/** groups mode: a member's role within their group. */
function groupMemberRole(groupId: string, memberId: string): Role | undefined {
  if (!host.secrets || host.secrets.kind !== 'groups') return undefined;
  return host.secrets.groups[groupId]?.roles[memberId];
}

function toggleReveal() {
  if (!answersRevealed.value) {
    if (
      !window.confirm(
        t('host.room.confirmReveal'),
      )
    )
      return;
  }
  answersRevealed.value = !answersRevealed.value;
}

async function endRoom() {
  if (!window.confirm(t('host.room.confirmEndRoom'))) return;
  router.replace('/undercover');
  void host.endRoom();
}

function kickPlayer(playerId: string, name: string) {
  if (!window.confirm(t('host.room.confirmKick', { name }))) return;
  void host.action({ type: 'kickPlayer', playerId });
}
</script>

<template>
  <div class="page page--wide dashboard">
    <div v-if="host.closedReason" class="card closed rise">
      <h2>{{ t('host.room.sessionEnded') }}</h2>
      <p>{{ host.closedReason }}</p>
      <router-link to="/undercover/host"><BaseButton variant="primary">{{ t('host.room.newRoom') }}</BaseButton></router-link>
    </div>

    <template v-else-if="host.room">
      <!-- Header: code + QR + controls -->
      <div class="card headline rise">
        <div class="join-info">
          <p class="session-name">{{ host.room.config.sessionName }}</p>
          <p class="mode-tag">{{ mode === 'team' ? t('host.setup.modeTeam') : t('host.setup.modeGroups') }}</p>
          <p class="join-label">{{ t('host.room.joinTitle') }}</p>
          <p class="join-url">{{ host.joinUrl ?? '…' }}</p>
          <p class="room-code" aria-label="Room code">{{ host.room.code }}</p>
          <p class="joined pop" :key="joinedCount">
            👥 {{ joinedCount }} {{ t('host.room.players') }}
          </p>
        </div>
        <div class="qr">
          <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR code to join this room" />
        </div>
        <div class="controls">
          <BaseButton v-if="canStart" variant="accent" size="lg" @click="host.action({ type: 'startGame' })">
            ▶ {{ t('host.room.startGame') }}
          </BaseButton>
          <BaseButton
            v-if="mode === 'team' && host.room.started && host.room.phase !== 'ended'"
            variant="ghost"
            @click="host.action({ type: 'skipPhase' })"
          >{{ t('host.room.skipPhase') }}</BaseButton>
          <BaseButton
            v-if="mode === 'team' && host.room.phase === 'elimination'"
            variant="primary"
            @click="host.action({ type: 'nextRound' })"
          >{{ t('game.nextRound') }}</BaseButton>
          <BaseButton
            v-if="mode === 'team' && host.room.phase === 'ended'"
            variant="accent"
            @click="host.action({ type: 'restartGame' })"
          >{{ t('host.room.playAgain') }}</BaseButton>
          <BaseButton variant="ghost" @click="toggleReveal">
            {{ answersRevealed ? t('host.room.hideAnswers') : t('host.room.revealAnswers') }}
          </BaseButton>
          <BaseButton variant="ghost" @click="settingsOpen = !settingsOpen">
            {{ settingsOpen ? t('host.room.closeSettings') : t('host.room.settings') }}
          </BaseButton>
          <BaseButton variant="danger" @click="endRoom">{{ t('host.room.endSession') }}</BaseButton>
        </div>
      </div>

      <!-- Settings panel (toggleable) -->
      <div v-if="settingsOpen" class="card settings rise">
        <h2>⚙️ Settings <span class="settings-note">(changes apply on next game start)</span></h2>
        <div class="settings-row">
          <label class="toggle">
            <input
              type="checkbox"
              :checked="host.room.config.includeMrWhite"
              @change="host.action({ type: 'updateConfig', config: { includeMrWhite: ($event.target as HTMLInputElement).checked } })"
            />
            <span>Include Mr White</span>
          </label>
          <label class="sfield">
            <span>Word pack</span>
            <select
              :value="host.room.config.packId"
              @change="host.action({ type: 'updateConfig', config: { packId: ($event.target as HTMLSelectElement).value } })"
            >
              <option v-for="pack in wordPacks" :key="pack.id" :value="pack.id">{{ pack.name }}</option>
            </select>
          </label>
          <label class="sfield">
            <span>{{ t('host.setup.undercoverCount') }}</span>
            <select
              :value="host.room.config.undercoverCount"
              @change="host.action({ type: 'updateConfig', config: { undercoverCount: Number(($event.target as HTMLSelectElement).value) } })"
            >
              <option v-for="n in [1, 2, 3]" :key="n" :value="n">{{ n }}</option>
            </select>
          </label>
          <label class="sfield">
            <span>{{ countLabel }}</span>
            <select
              :value="host.room.config.groupCount"
              @change="host.action({ type: 'updateConfig', config: { groupCount: Number(($event.target as HTMLSelectElement).value) } })"
            >
              <option v-for="n in liveCountOptions" :key="n" :value="n">{{ n }}</option>
            </select>
          </label>
          <label v-if="!isSolo" class="sfield">
            <span>{{ sizeLabel }}</span>
            <select
              :value="host.room.config.groupSize"
              @change="host.action({ type: 'updateConfig', config: { groupSize: Number(($event.target as HTMLSelectElement).value) } })"
            >
              <option v-for="n in liveSizeOptions" :key="n" :value="n">{{ n }}</option>
            </select>
          </label>
          <label class="sfield">
            <span>Discussion</span>
            <select
              :value="host.room.config.discussSeconds"
              @change="host.action({ type: 'updateConfig', config: { discussSeconds: Number(($event.target as HTMLSelectElement).value) } })"
            >
              <option v-for="s in [30, 45, 60, 90, 120]" :key="s" :value="s">{{ s }}s</option>
            </select>
          </label>
          <label class="sfield">
            <span>Voting</span>
            <select
              :value="host.room.config.voteSeconds"
              @change="host.action({ type: 'updateConfig', config: { voteSeconds: Number(($event.target as HTMLSelectElement).value) } })"
            >
              <option v-for="s in [15, 20, 30, 45, 60]" :key="s" :value="s">{{ s }}s</option>
            </select>
          </label>
        </div>
        <p class="settings-status">
          Undercovers: {{ host.room?.config.undercoverCount }} ·
          Mr White: {{ host.room?.config.includeMrWhite ? '✅ On' : '❌ Off' }} ·
          {{ isSolo ? 'Players' : (mode === 'groups' ? 'Groups' : 'Teams') }}: {{ host.room?.config.groupCount }}{{ !isSolo ? ` × ${host.room?.config.groupSize}` : '' }} ·
          Pack: {{ wordPacks.find(p => p.id === host.room?.config.packId)?.name ?? host.room?.config.packId }} ·
          Discuss: {{ host.room?.config.discussSeconds }}s ·
          Vote: {{ host.room?.config.voteSeconds }}s
        </p>
      </div>

      <p v-if="host.error" class="error" role="alert">{{ host.error }}</p>

      <!-- team mode: one-game progress -->
      <div v-if="mode === 'team' && host.room.started" class="card progress rise">
        <div class="prog-head">
          <span class="phase-tag">{{ phaseLabel(host.room.phase) }}</span>
          <span v-if="host.room.round" class="round-tag">{{ t('host.room.roundNum', { n: host.room.round }) }}</span>
          <span
            v-if="secondsLeft(host.room.phaseEndsAt) !== null"
            class="timer"
            :class="{ urgent: (secondsLeft(host.room.phaseEndsAt) ?? 99) <= 10 }"
          >⏱ {{ secondsLeft(host.room.phaseEndsAt) }}s</span>
        </div>
        <p v-if="host.room.phase === 'reveal'" class="prog-line">🔐 {{ t('host.room.membersReady', { ready: readyTotal, total: memTotal }) }}</p>
        <p v-else-if="host.room.currentSpeakerGroupId" class="prog-line">
          🎤 {{ t(isSolo ? 'host.room.speakingPlayer' : 'host.room.speakingTeam', { name: host.room.groups[host.room.currentSpeakerGroupId]?.name }) }}
        </p>
        <p v-else-if="host.room.phase === 'vote'" class="prog-line">
          🗳 {{ t(isSolo ? 'host.room.votedPlayers' : 'host.room.votedTeams', { voted: host.room.votesIn, total: host.room.votersTotal }) }}
          <span v-if="host.room.isRunoffVote" class="tag">{{ t('host.room.runoffVote') }}</span>
        </p>
        <p v-else-if="host.room.phase === 'elimination'" class="prog-line">
          {{
            host.room.lastElimination
              ? t(isSolo ? 'host.room.votedOutPlayer' : 'host.room.votedOutTeam', { name: host.room.groups[host.room.lastElimination.groupId]?.name, role: roleLabel(host.room.lastElimination.role) })
              : t(isSolo ? 'host.room.tieNoEliminationPlayer' : 'host.room.tieNoElimination')
          }}
        </p>
        <p v-else-if="host.room.phase === 'ended'" class="prog-line win">
          {{ host.room.winner === 'civilians' ? t(isSolo ? 'host.room.winCivilians' : 'host.room.civilianTeamsWin') : t(isSolo ? 'host.room.winUndercover' : 'host.room.undercoverTeamWins') }}
        </p>
      </div>

      <p v-if="unassigned.length" class="card unassigned rise">
        <strong>{{ t('host.room.choosingTeam') }}</strong>
        <span v-for="p in unassigned" :key="p.id" class="chip">
          {{ p.name }}
          <button type="button" class="kick-btn" :title="t('host.room.kick')" @click="kickPlayer(p.id, p.name)">✕</button>
        </span>
      </p>

      <!-- Team cards -->
      <div class="groups">
        <div
          v-for="g in activeGroups"
          :key="g.id"
          class="card group rise"
          :class="[`group-${g.id.toLowerCase()}`, { out: mode === 'team' && host.room?.started && !g.alive }]"
        >
          <header class="group-head">
            <span class="group-name">{{ g.name }}</span>
            <span class="group-status">
              {{ mode === 'team' ? (!host.room?.started ? t('host.room.groupWaiting') : g.alive ? t('host.room.groupIn') : t('host.room.groupOut')) : (g.phase ? phaseLabel(g.phase) : t('host.room.groupWaiting')) }}
            </span>
          </header>

          <div class="group-meta">
            <span>{{ t('host.room.membersCount', { count: g.playerCount, total: host.room?.config.groupSize }) }}</span>
            <span v-if="mode === 'groups' && g.round">{{ t('host.room.roundNum', { n: g.round }) }}</span>
            <span v-if="secondsLeft(g.phaseEndsAt) !== null" class="gtimer" :class="{ urgent: (secondsLeft(g.phaseEndsAt) ?? 99) <= 10 }">⏱ {{ secondsLeft(g.phaseEndsAt) }}s</span>
          </div>

          <!-- groups mode: this group's internal game -->
          <template v-if="mode === 'groups' && g.phase">
            <p v-if="g.phase === 'reveal'" class="gprog">🔐 {{ t('host.room.membersReady', { ready: g.readyMemberIds.length, total: g.playerCount }) }}</p>
            <p v-else-if="g.currentSpeakerId" class="gprog">🎤 {{ t('host.room.speakingPlayer', { name: memberName(g.currentSpeakerId) }) }}</p>
            <p v-else-if="g.phase === 'vote'" class="gprog">
              🗳 {{ t('host.room.votedPlayers', { voted: g.votesIn, total: g.votersTotal }) }} <span v-if="g.isRunoffVote" class="tag">{{ t('host.room.runoffVote') }}</span>
            </p>
            <p v-else-if="g.phase === 'elimination'" class="gprog">
              {{ g.lastElimination ? t('host.room.votedOutPlayer', { name: memberName(g.lastElimination.playerId), role: roleLabel(g.lastElimination.role) }) : t('host.room.tieNoEliminationPlayer') }}
            </p>
            <p v-else-if="g.phase === 'ended'" class="gprog win">{{ winnerLabel(g) }}</p>
          </template>

          <!-- team mode: reveal progress -->
          <p v-else-if="mode === 'team' && host.room?.phase === 'reveal'" class="gprog">
            🔐 {{ t('host.room.membersReady', { ready: g.readyMemberIds.length, total: g.playerCount }) }}
          </p>

          <ul class="members">
            <li
              v-for="pid in g.memberIds"
              :key="pid"
              :class="{ off: !host.playerById(pid)?.connected, out: mode === 'groups' && host.playerById(pid)?.alive === false }"
            >
              <span class="dot" :class="host.playerById(pid)?.connected ? 'on' : 'off'" />
              {{ host.playerById(pid)?.name }}
              <span v-if="answersRevealed && mode === 'team' && teamGroupRole(g.id)" class="reveal-tag">{{ roleLabel(teamGroupRole(g.id)) }}</span>
              <span v-if="answersRevealed && mode === 'groups' && groupMemberRole(g.id, pid)" class="reveal-tag">{{ roleLabel(groupMemberRole(g.id, pid)) }}</span>
              <button type="button" class="kick-btn" :title="t('host.room.kick')" @click="kickPlayer(pid, host.playerById(pid)?.name ?? '')">✕</button>
            </li>
          </ul>

          <!-- groups mode: per-group controls -->
          <div v-if="mode === 'groups' && g.phase && g.phase !== 'reveal'" class="group-actions">
            <BaseButton v-if="g.phase !== 'ended' && g.phase !== 'elimination'" variant="ghost" @click="host.action({ type: 'skipPhase', groupId: g.id })">{{ t('host.room.skip') }}</BaseButton>
            <BaseButton v-if="g.phase === 'elimination'" variant="primary" @click="host.action({ type: 'nextRound', groupId: g.id })">{{ t('game.nextRound') }}</BaseButton>
            <BaseButton v-if="g.phase === 'ended'" variant="accent" @click="host.action({ type: 'restartGame', groupId: g.id })">{{ t('host.room.playAgain') }}</BaseButton>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="loading-box">
      <p>{{ t('host.room.reconnecting') }}</p>
      <router-link to="/undercover" class="back-link">{{ t('host.room.backToMenu') }}</router-link>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  padding-top: 24px;
}

.headline {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 18px;
  align-items: center;
  margin-bottom: 16px;
  background: linear-gradient(160deg, var(--violet-800), var(--violet-600));
  color: #fff;
}

.session-name {
  font-weight: 800;
  opacity: 0.85;
  margin: 0 0 4px;
}

.mode-tag {
  margin: 0 0 10px;
  font-size: 0.8rem;
  font-weight: 700;
  opacity: 0.75;
}

.join-label {
  margin: 0;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.7;
}

.join-url {
  font-weight: 700;
  font-size: 1.05rem;
  margin: 0 0 10px;
  word-break: break-all;
}

.room-code {
  font-size: clamp(2.6rem, 6vw, 4rem);
  font-weight: 800;
  letter-spacing: 0.18em;
  margin: 0;
  line-height: 1;
}

.joined {
  margin: 10px 0 0;
  font-weight: 700;
  opacity: 0.9;
}

.qr img {
  display: block;
  border-radius: var(--radius-s);
  background: #fff;
  padding: 6px;
}

.controls {
  grid-column: 1 / -1;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.prog-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.phase-tag {
  font-weight: 800;
  color: var(--violet-700);
  background: var(--violet-050);
  border-radius: 999px;
  padding: 6px 16px;
  font-size: 1.35rem;
}

.round-tag {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--ink-soft);
}

.timer {
  margin-left: auto;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  font-size: 1.3rem;
}

.timer.urgent {
  color: var(--danger);
  animation: pulse-soft 1s ease-in-out infinite;
}

.prog-line {
  margin: 0;
  font-size: 1.25rem;
}

.prog-line.win {
  font-weight: 800;
  font-size: 1.55rem;
}

.tag {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  background: var(--violet-100);
  color: var(--violet-800);
  border-radius: 999px;
  padding: 2px 8px;
  margin-left: 6px;
}

.unassigned {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 0.9rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--violet-050);
  color: var(--violet-800);
  font-weight: 700;
  border-radius: 999px;
  padding: 4px 8px 4px 12px;
  font-size: 0.85rem;
}

.kick-btn {
  border: none;
  background: transparent;
  color: var(--ink-soft);
  font-weight: 700;
  font-size: 0.8rem;
  line-height: 1;
  padding: 2px 4px;
  border-radius: 999px;
  cursor: pointer;
  transition: color var(--t-fast), background var(--t-fast);
}

.kick-btn:hover {
  color: #fff;
  background: var(--danger);
}

.groups {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.group {
  border-top: 5px solid var(--line);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-a { border-top-color: var(--group-a); }
.group-b { border-top-color: var(--group-b); }
.group-c { border-top-color: var(--group-c); }
.group-d { border-top-color: var(--group-d); }
.group-e { border-top-color: var(--violet-600); }
.group-f { border-top-color: var(--violet-700); }

.group.out {
  opacity: 0.6;
}

.group-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.group-name {
  font-weight: 800;
  font-size: 1.15rem;
}

.group-status {
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
  background: var(--bg);
  border-radius: 999px;
  padding: 3px 10px;
}

.group-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  color: var(--ink-soft);
  font-size: 0.85rem;
  font-weight: 700;
  flex-wrap: wrap;
}

.gtimer {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

.gtimer.urgent {
  color: var(--danger);
}

.gprog {
  margin: 0;
  font-size: 0.92rem;
}

.gprog.win {
  font-weight: 800;
}

.members {
  list-style: none;
  padding: 0;
  margin: 4px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.members li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 0.85rem;
  font-weight: 700;
}

.members li.off {
  opacity: 0.55;
}

.members li.out {
  text-decoration: line-through;
  opacity: 0.55;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.dot.on { background: var(--success); }
.dot.off { background: var(--danger); }

.reveal-tag {
  font-size: 0.66rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #fff;
  background: var(--danger);
  border-radius: 999px;
  padding: 2px 7px;
}

.group-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: 6px;
}

.error {
  color: var(--danger);
  font-weight: 700;
}

/* ── Settings panel ───────────────────── */
.settings {
  margin-bottom: 16px;
}

.settings h2 {
  font-size: 1.05rem;
  margin-bottom: 12px;
}

.settings-note {
  font-weight: 500;
  font-size: 0.78rem;
  color: var(--ink-soft);
}

.settings-row {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  align-items: center;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.92rem;
}

.toggle input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--violet-600);
  cursor: pointer;
}

.sfield {
  display: grid;
  gap: 3px;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--ink-soft);
  min-width: 120px;
}

.sfield select {
  border: 2px solid var(--line);
  border-radius: var(--radius-s);
  padding: 6px 8px;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--ink);
  background: var(--surface);
}

.sfield select:focus {
  outline: none;
  border-color: var(--violet-600);
}

.settings-status {
  margin: 10px 0 0;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--ink-soft);
}

.closed {
  text-align: center;
}

.loading-box {
  text-align: center;
  color: var(--ink-soft);
  padding: 40px 0;
}

.back-link {
  display: inline-block;
  margin-top: 12px;
  color: var(--violet-700);
  font-weight: 700;
}

@media (max-width: 640px) {
  .headline {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .qr img {
    margin: 0 auto;
  }

  .controls {
    justify-content: center;
  }
}
</style>
