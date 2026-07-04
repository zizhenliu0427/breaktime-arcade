<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { DEFAULT_ROOM_CONFIG, GROUP_IDS, wordPacks } from '@arcade/shared';
import BaseButton from '../../components/ui/BaseButton.vue';
import { useOnlineHostStore } from '../../stores/onlineHost';

const { t } = useI18n();

const router = useRouter();
const host = useOnlineHostStore();

const config = reactive({ ...DEFAULT_ROOM_CONFIG });
const creating = ref(false);

/* ── Play style (intent-first) ──────────────────────────────────
 * The room model underneath only knows `mode` + `groupCount` + `groupSize`.
 * We expose a friendlier "how are you playing?" choice and map it onto those
 * fields, so small groups never have to think in "groups × players".
 *   solo     → one game, every player is their own seat (team mode, size 1)
 *   teams    → one game, each team shares a word (team mode, size > 1)
 *   parallel → each group plays its own separate game (groups mode)
 */
type PlayStyle = 'solo' | 'teams' | 'parallel';

/** Above this many players in a single game, turn-taking (speak + vote) gets slow. */
const COMFORTABLE_MAX = 12;

function styleFromConfig(): PlayStyle {
  if (config.mode === 'groups') return 'parallel';
  return config.groupSize <= 1 ? 'solo' : 'teams';
}
const playStyle = ref<PlayStyle>(styleFromConfig());

const styles = computed(() => [
  { id: 'solo' as const, emoji: '🙋', title: t('host.setup.styleSolo'), desc: t('host.setup.styleSoloDesc') },
  { id: 'teams' as const, emoji: '🤝', title: t('host.setup.styleTeams'), desc: t('host.setup.styleTeamsDesc') },
  { id: 'parallel' as const, emoji: '🎲', title: t('host.setup.styleParallel'), desc: t('host.setup.styleParallelDesc') },
]);

function setStyle(s: PlayStyle) {
  playStyle.value = s;
  const minCount = (config.includeMrWhite && s === 'teams') ? 4 : 3;
  const minSize = (config.includeMrWhite && s === 'parallel') ? 4 : 3;
  const minSolo = config.includeMrWhite ? 4 : 3;

  if (s === 'solo') {
    config.mode = 'team';
    config.groupSize = 1;
    if (config.groupCount < minSolo) config.groupCount = Math.max(6, minSolo);
  } else if (s === 'teams') {
    config.mode = 'team';
    if (config.groupSize < 2) config.groupSize = 6;
    if (config.groupCount < minCount) config.groupCount = Math.max(4, minCount);
  } else {
    config.mode = 'groups';
    if (config.groupSize < minSize) config.groupSize = Math.max(6, minSize);
    if (config.groupCount < 1) config.groupCount = 4;
  }
}

// Watch includeMrWhite to automatically adjust configurations to the minimum of 4 players
watch(() => config.includeMrWhite, (include) => {
  if (include) {
    if (playStyle.value === 'solo' && config.groupCount < 4) {
      config.groupCount = 4;
    } else if (playStyle.value === 'teams' && config.groupCount < 4) {
      config.groupCount = 4;
    } else if (playStyle.value === 'parallel' && config.groupSize < 4) {
      config.groupSize = 4;
    }
  }
});

// Clamp free-form numeric inputs to the server's legal ranges. The server
// re-clamps too, but we do it on blur (not on every keystroke via a watcher)
// so typing into the field doesn't fight the user mid-input.
const clampTo = (v: number, lo: number, hi: number, fallback: number) => {
  const n = Math.round(v);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, lo), hi);
};
function clampUndercover() { config.undercoverCount = clampTo(config.undercoverCount, 1, 5, 1); }
function clampDiscuss() { config.discussSeconds = clampTo(config.discussSeconds, 10, 300, 45); }
function clampVote() { config.voteSeconds = clampTo(config.voteSeconds, 10, 120, 20); }

const showGroupControls = computed(() => playStyle.value === 'teams' || playStyle.value === 'parallel');
const showSoloControl = computed(() => playStyle.value === 'solo');
const countLabel = computed(() =>
  playStyle.value === 'parallel' ? t('host.setup.numGroups') : t('host.setup.numTeams'),
);
const sizeLabel = computed(() =>
  playStyle.value === 'parallel' ? t('host.setup.perGroup') : t('host.setup.perTeam'),
);
const MAX_GROUP_COUNT = 24;
const countOptions = computed(() => {
  if (playStyle.value === 'parallel') return Array.from({ length: MAX_GROUP_COUNT }, (_, i) => i + 1);
  const min = (config.includeMrWhite && playStyle.value === 'teams') ? 4 : 3;
  return Array.from({ length: MAX_GROUP_COUNT - min + 1 }, (_, i) => min + i);
});
const sizeOptions = computed(() => {
  if (playStyle.value === 'parallel') {
    const min = config.includeMrWhite ? 4 : 3;
    return Array.from({ length: MAX_GROUP_COUNT - min + 1 }, (_, i) => min + i);
  }
  return Array.from({ length: MAX_GROUP_COUNT - 1 }, (_, i) => i + 2); // 2..MAX
});
const soloCountOptions = computed(() => {
  const min = config.includeMrWhite ? 4 : 3;
  return Array.from({ length: GROUP_IDS.length - min + 1 }, (_, i) => min + i);
});
// One "seat" = one unit that speaks/votes in a game:
//   solo     → each player is a seat            (groupCount)
//   teams    → each TEAM is a seat              (groupCount) — members share one word
//   parallel → each group is its own game        (groupSize)  — seats live inside one group
const perGameSeats = computed(() =>
  playStyle.value === 'parallel' ? config.groupSize : config.groupCount,
);
const tooLarge = computed(() => perGameSeats.value > COMFORTABLE_MAX);

// Recommended undercover count ≈ seats / 4 (1 for 3–5, 2 for 6–8, 3 for 9–12…).
// Pure UI hint — the host can still pick any value in range.
const recommendedUndercovers = computed(() => Math.max(1, Math.round(perGameSeats.value / 4)));
const undercoverHint = computed(() => {
  const rec = recommendedUndercovers.value;
  if (config.undercoverCount === rec) return '';            // already on the recommended value
  return t('host.setup.undercoverHint', { players: perGameSeats.value, n: rec });
});
// Mr White is more fun (and fairer) with ≥6 players in a game.
const mrWhiteHintOn = computed(() => perGameSeats.value < 6);

const capacityHint = computed(() => {
  if (playStyle.value === 'solo') return t('host.setup.capSolo', { n: config.groupCount });
  const total = config.groupCount * config.groupSize;
  return playStyle.value === 'parallel'
    ? t('host.setup.capParallel', { groups: config.groupCount, size: config.groupSize, total })
    : t('host.setup.capTeams', { teams: config.groupCount, size: config.groupSize, total });
});

async function create() {
  creating.value = true;
  try {
    await host.create(config);
    router.push('/undercover/host/room');
  } catch (err) {
    host.error = err instanceof Error ? err.message : String(err);
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <div class="page">
    <h1 class="rise">📡 {{ t('host.setup.title') }}</h1>
    <p class="sub rise" style="animation-delay: 50ms">
      {{ t('host.setup.subtitle') }}
    </p>

    <!-- Session name -->
    <div class="card rise" style="animation-delay: 90ms">
      <h2>{{ t('host.setup.sessionLabel') }}</h2>
      <label class="field">
        <span>{{ t('host.setup.session') }}</span>
        <input v-model="config.sessionName" type="text" maxlength="40" />
      </label>
    </div>

    <!-- Play style -->
    <div class="card rise" style="animation-delay: 120ms">
      <h2>{{ t('host.setup.playStyleLabel') }}</h2>
      <div class="styles" role="radiogroup" :aria-label="t('host.setup.playStyleLabel')">
        <button
          v-for="s in styles"
          :key="s.id"
          type="button"
          class="style"
          role="radio"
          :aria-checked="playStyle === s.id"
          :class="{ active: playStyle === s.id }"
          @click="setStyle(s.id)"
        >
          <span class="style-emoji" aria-hidden="true">{{ s.emoji }}</span>
          <span class="style-body">
            <strong>{{ s.title }}</strong>
            <span class="style-desc">{{ s.desc }}</span>
          </span>
        </button>
      </div>

      <div v-if="showGroupControls" class="row group-row">
        <label class="field">
          <span>{{ countLabel }}</span>
          <select v-model.number="config.groupCount">
            <option v-for="n in countOptions" :key="n" :value="n">{{ n }}</option>
          </select>
        </label>
        <label class="field">
          <span>{{ sizeLabel }}</span>
          <select v-model.number="config.groupSize">
            <option v-for="n in sizeOptions" :key="n" :value="n">{{ n }}</option>
          </select>
        </label>
      </div>

      <div v-if="showSoloControl" class="row group-row">
        <label class="field">
          <span>{{ t('host.setup.numPlayers') }}</span>
          <select v-model.number="config.groupCount">
            <option v-for="n in soloCountOptions" :key="n" :value="n">{{ n }}</option>
          </select>
        </label>
      </div>

      <p class="hint cap-hint">{{ capacityHint }}</p>
      <p v-if="tooLarge" class="hint solo-warning">⚠️ {{ t('host.setup.tooLargeWarning') }}</p>
    </div>

    <!-- Game options -->
    <div class="card rise" style="animation-delay: 150ms">
      <h2>{{ t('host.setup.gameLabel') }}</h2>
      <div class="row">
        <label class="field">
          <span>{{ t('host.setup.wordPack') }}</span>
          <select v-model="config.packId">
            <option v-for="pack in wordPacks" :key="pack.id" :value="pack.id">
              {{ pack.name }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>{{ t('host.setup.undercoverCount') }}</span>
          <input v-model.number="config.undercoverCount" type="number" min="1" max="5" step="1" inputmode="numeric" @blur="clampUndercover" />
          <span v-if="undercoverHint" class="field-hint">💡 {{ undercoverHint }}</span>
        </label>
        <label class="field">
          <span>{{ t('host.setup.discussTimer') }}</span>
          <input v-model.number="config.discussSeconds" type="number" min="10" max="300" step="5" inputmode="numeric" @blur="clampDiscuss" />
          <span class="field-suffix">s</span>
        </label>
        <label class="field">
          <span>{{ t('host.setup.voteTimer') }}</span>
          <input v-model.number="config.voteSeconds" type="number" min="10" max="120" step="5" inputmode="numeric" @blur="clampVote" />
          <span class="field-suffix">s</span>
        </label>
      </div>
      <label class="toggle">
        <input v-model="config.includeMrWhite" type="checkbox" />
        <span>{{ t('host.setup.mrWhite') }}</span>
        <span class="toggle-hint">{{ mrWhiteHintOn ? t('host.setup.mrWhiteHintFew') : t('host.setup.mrWhiteHint') }}</span>
      </label>
    </div>

    <p v-if="host.error" class="error" role="alert">{{ host.error }}</p>

    <div class="start rise" style="animation-delay: 180ms">
      <BaseButton variant="accent" size="lg" block :disabled="creating" @click="create">
        {{ creating ? t('host.setup.creating') : t('host.setup.create') }}
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.sub {
  color: var(--ink-soft);
  margin-bottom: 20px;
}

.card {
  margin-bottom: 14px;
}

.card h2 {
  font-size: 1.05rem;
  margin-bottom: 12px;
}

.row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-start; /* don't stretch fields to equal height — a hint under one field must not push the others' inputs down */
}

.group-row {
  margin-top: 14px;
}

.field {
  display: grid;
  gap: 4px;
  flex: 1;
  min-width: 140px;
  position: relative;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ink-soft);
}

.field input,
.field select {
  border: 2px solid var(--line);
  border-radius: var(--radius-s);
  padding: 10px 12px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink);
  background: var(--surface);
  transition: border-color var(--t-fast);
}

.field input:focus,
.field select:focus {
  outline: none;
  border-color: var(--violet-600);
}

/* small inline hint below a field (e.g. recommended value) */
.field-hint {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--ink-soft);
  margin-top: 2px;
}

/* unit suffix next to a numeric input ("s" for seconds) */
.field-suffix {
  position: absolute;
  right: 12px;
  bottom: 11px;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ink-soft);
  pointer-events: none;
}

.field:has(.field-suffix) input {
  position: relative;
  padding-right: 26px;
}

/* hide the spinner arrows on number inputs — the step + clamp does it */
.field input[type="number"]::-webkit-outer-spin-button,
.field input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.field input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* ── Play-style cards ───────────────────────── */
.styles {
  display: grid;
  gap: 10px;
}

@media (min-width: 640px) {
  .styles {
    grid-template-columns: repeat(3, 1fr);
  }
}

.style {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  text-align: left;
  background: var(--surface);
  border-radius: var(--radius-m);
  box-shadow: inset 0 0 0 2px var(--line);
  padding: 14px;
  transition:
    box-shadow var(--t-fast),
    background var(--t-fast),
    transform var(--t-fast) var(--ease-pop);
}

.style:hover {
  transform: translateY(-2px);
}

.style.active {
  box-shadow: inset 0 0 0 3px var(--violet-600);
  background: var(--violet-050);
}

.style-emoji {
  font-size: 1.5rem;
  line-height: 1.2;
}

.style-body {
  display: grid;
  gap: 3px;
}

.style-body strong {
  font-size: 0.98rem;
  color: var(--ink);
}

.style-desc {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--ink-soft);
  line-height: 1.35;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 14px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
}

.toggle input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--violet-600);
  cursor: pointer;
}

.toggle-hint {
  flex-basis: 100%;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--ink-soft);
  padding-left: 26px;
}

.hint {
  color: var(--ink-soft);
  font-size: 0.85rem;
  margin: 12px 0 0;
}

.solo-warning {
  color: var(--accent-press);
  font-weight: 700;
}

.cap-hint {
  font-weight: 600;
}

.error {
  color: var(--danger);
  font-weight: 700;
}

.start {
  margin-top: 20px;
}
</style>
