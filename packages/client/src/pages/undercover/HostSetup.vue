<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
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

/** Above this, solo turn-taking (everyone speaks + votes one at a time) gets slow. */
const SOLO_COMFORTABLE_MAX = 12;

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
  if (s === 'solo') {
    config.mode = 'team';
    config.groupSize = 1;
    if (config.groupCount < 3) config.groupCount = 6;
  } else if (s === 'teams') {
    config.mode = 'team';
    if (config.groupSize < 2) config.groupSize = 6;
    if (config.groupCount < 3) config.groupCount = 4;
  } else {
    config.mode = 'groups';
    if (config.groupSize < 3) config.groupSize = 6;
    if (config.groupCount < 1) config.groupCount = 4;
  }
}

const showGroupControls = computed(() => playStyle.value === 'teams' || playStyle.value === 'parallel');
const showSoloControl = computed(() => playStyle.value === 'solo');
const countLabel = computed(() =>
  playStyle.value === 'parallel' ? t('host.setup.numGroups') : t('host.setup.numTeams'),
);
const sizeLabel = computed(() =>
  playStyle.value === 'parallel' ? t('host.setup.perGroup') : t('host.setup.perTeam'),
);
const countOptions = computed(() => (playStyle.value === 'parallel' ? [1, 2, 3, 4, 5, 6] : [3, 4, 5, 6]));
const sizeOptions = computed(() =>
  playStyle.value === 'parallel' ? [3, 4, 5, 6, 7, 8, 9, 10] : [2, 3, 4, 5, 6, 7, 8, 9, 10],
);
const soloCountOptions = computed(() => Array.from({ length: GROUP_IDS.length - 2 }, (_, i) => i + 3)); // 3..24
const soloTooLarge = computed(() => playStyle.value === 'solo' && config.groupCount > SOLO_COMFORTABLE_MAX);

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
      <p v-if="soloTooLarge" class="hint solo-warning">⚠️ {{ t('host.setup.soloLargeWarning') }}</p>
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
          <select v-model.number="config.undercoverCount">
            <option v-for="n in [1, 2, 3]" :key="n" :value="n">{{ n }}</option>
          </select>
        </label>
        <label class="field">
          <span>{{ t('host.setup.discussTimer') }}</span>
          <select v-model.number="config.discussSeconds">
            <option v-for="s in [30, 45, 60, 90, 120]" :key="s" :value="s">{{ s }}s</option>
          </select>
        </label>
        <label class="field">
          <span>{{ t('host.setup.voteTimer') }}</span>
          <select v-model.number="config.voteSeconds">
            <option v-for="s in [15, 20, 30, 45, 60]" :key="s" :value="s">{{ s }}s</option>
          </select>
        </label>
      </div>
      <label class="toggle">
        <input v-model="config.includeMrWhite" type="checkbox" />
        <span>{{ t('host.setup.mrWhite') }}</span>
        <span class="toggle-hint">{{ t('host.setup.mrWhiteHint') }}</span>
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
}

.group-row {
  margin-top: 14px;
}

.field {
  display: grid;
  gap: 4px;
  flex: 1;
  min-width: 140px;
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
