<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { wordPacks } from '@arcade/shared';
import BaseButton from '../../components/ui/BaseButton.vue';
import { usePassPlayStore } from '../../stores/passPlay';

const { t } = useI18n();
const router = useRouter();
const store = usePassPlayStore();

const names = ref<string[]>([]);
const draft = ref('');
const packId = ref('en-easy');
const error = ref('');

const canStart = computed(() => names.value.length >= 3);

function addName() {
  const name = draft.value.trim();
  if (!name) return;
  if (names.value.some((n) => n.toLowerCase() === name.toLowerCase())) {
    error.value = t('passPlay.nameAlreadyExists');
    return;
  }
  if (names.value.length >= 10) {
    error.value = t('passPlay.maxPlayersLimit');
    return;
  }
  names.value.push(name);
  draft.value = '';
  error.value = '';
}

function removeName(i: number) {
  names.value.splice(i, 1);
}

function start() {
  if (!canStart.value) return;
  store.startGame(names.value, packId.value);
  router.push('/undercover/pass-and-play/game');
}
</script>

<template>
  <div class="page">
    <h1 class="rise">🤝 {{ t('passPlay.setupTitle') }}</h1>
    <p class="sub rise" style="animation-delay: 50ms">
      {{ t('passPlay.setupSubtitle') }}
    </p>

    <div class="card rise" style="animation-delay: 90ms">
      <h2>{{ t('passPlay.players') }}</h2>
      <form class="add-row" @submit.prevent="addName">
        <input
          v-model="draft"
          type="text"
          :placeholder="t('passPlay.typeAName')"
          maxlength="20"
          autocomplete="off"
          enterkeyhint="done"
          aria-label="Player name"
        />
        <BaseButton variant="primary" @click="addName">{{ t('passPlay.add') }}</BaseButton>
      </form>
      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <TransitionGroup name="chip" tag="ul" class="chips" aria-live="polite">
        <li v-for="(name, i) in names" :key="name" class="chip">
          {{ name }}
          <button class="remove" type="button" :aria-label="`Remove ${name}`" @click="removeName(i)">
            ×
          </button>
        </li>
      </TransitionGroup>
      <p v-if="names.length < 3" class="hint">
        {{ names.length === 2 ? t('passPlay.addMoreOnePlayer') : t('passPlay.addMorePlayers', { n: 3 - names.length }) }}
      </p>
    </div>

    <div class="card rise" style="animation-delay: 130ms">
      <h2>{{ t('host.setup.wordPack') }}</h2>
      <div class="packs" role="radiogroup" aria-label="Word pack">
        <button
          v-for="pack in wordPacks"
          :key="pack.id"
          type="button"
          class="pack"
          role="radio"
          :aria-checked="packId === pack.id"
          :class="{ active: packId === pack.id }"
          @click="packId = pack.id"
        >
          <strong>{{ pack.difficulty === 'easy' ? t('passPlay.easy') : t('passPlay.medium') }}</strong>
          <span>{{ t('passPlay.wordPairsCount', { n: pack.pairs.length }) }}</span>
        </button>
      </div>
    </div>

    <div class="start rise" style="animation-delay: 170ms">
      <BaseButton variant="accent" size="lg" block :disabled="!canStart" @click="start">
        {{ t('passPlay.startGameWithCount', { n: names.length }) }}
      </BaseButton>
      <p class="hint">{{ t('passPlay.setupHint') }}</p>
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

.add-row {
  display: flex;
  gap: 8px;
}

.add-row input {
  flex: 1;
  min-width: 0;
  border: 2px solid var(--line);
  border-radius: var(--radius-m);
  padding: 11px 14px;
  font-size: 1rem;
  transition: border-color var(--t-fast);
}

.add-row input:focus {
  outline: none;
  border-color: var(--violet-600);
}

.error {
  color: var(--danger);
  font-size: 0.85rem;
  margin: 8px 0 0;
}

.chips {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0;
  margin: 14px 0 0;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--violet-050);
  color: var(--violet-800);
  font-weight: 700;
  border-radius: 999px;
  padding: 7px 8px 7px 14px;
}

.chip .remove {
  background: var(--violet-100);
  color: var(--violet-800);
  border-radius: 999px;
  width: 22px;
  height: 22px;
  line-height: 1;
  font-size: 0.95rem;
  display: grid;
  place-items: center;
}

.chip-enter-active,
.chip-leave-active {
  transition: all var(--t-med) var(--ease-pop);
}

.chip-enter-from,
.chip-leave-to {
  opacity: 0;
  transform: scale(0.7);
}

.hint {
  color: var(--ink-soft);
  font-size: 0.88rem;
  margin: 12px 0 0;
  text-align: center;
}

.packs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.pack {
  display: grid;
  gap: 2px;
  background: var(--surface);
  border-radius: var(--radius-m);
  box-shadow: inset 0 0 0 2px var(--line);
  padding: 14px;
  text-align: left;
  transition:
    box-shadow var(--t-fast),
    background var(--t-fast),
    transform var(--t-fast) var(--ease-pop);
}

.pack:hover {
  box-shadow: inset 0 0 0 2px var(--violet-600);
  transform: translateY(-2px);
}

.pack.active {
  animation: pop-in var(--t-med) var(--ease-pop);
}

.pack span {
  color: var(--ink-soft);
  font-size: 0.82rem;
}

.pack.active {
  box-shadow: inset 0 0 0 3px var(--violet-600);
  background: var(--violet-050);
}

.start {
  margin-top: 20px;
}
</style>
