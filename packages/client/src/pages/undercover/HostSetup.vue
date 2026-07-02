<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { DEFAULT_ROOM_CONFIG, wordPacks } from '@arcade/shared';
import BaseButton from '../../components/ui/BaseButton.vue';
import { useOnlineHostStore } from '../../stores/onlineHost';

const { t } = useI18n();

const router = useRouter();
const host = useOnlineHostStore();

const config = reactive({ ...DEFAULT_ROOM_CONFIG });
const creating = ref(false);

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

    <div class="card rise" style="animation-delay: 90ms">
      <h2>{{ t('host.setup.sessionLabel') }}</h2>
      <label class="field">
        <span>{{ t('host.setup.session') }}</span>
        <input v-model="config.sessionName" type="text" maxlength="40" />
      </label>
      <div class="row">
        <label class="field">
          <span>{{ t('host.setup.groups') }}</span>
          <select v-model.number="config.groupCount">
            <option v-for="n in 6" :key="n" :value="n">{{ n }}</option>
          </select>
        </label>
        <label class="field">
          <span>{{ t('host.setup.groupSize') }}</span>
          <select v-model.number="config.groupSize">
            <option v-for="n in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]" :key="n" :value="n">{{ n }}</option>
          </select>
        </label>
      </div>
    </div>

    <div class="card rise" style="animation-delay: 130ms">
      <h2>{{ t('host.setup.gameLabel') }}</h2>
      <div class="row">
        <label class="field">
          <span>{{ t('host.setup.mode') }}</span>
          <select v-model="config.mode">
            <option value="team">{{ t('host.setup.modeTeam') }}</option>
            <option value="groups">{{ t('host.setup.modeGroups') }}</option>
          </select>
        </label>
        <label class="field">
          <span>{{ t('host.setup.wordPack') }}</span>
          <select v-model="config.packId">
            <option v-for="pack in wordPacks" :key="pack.id" :value="pack.id">
              {{ pack.name }}
            </option>
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
      <p class="hint">
        1 undercover {{ config.mode === 'team' ? 'team' : 'player' }} ·
        Mr White {{ config.includeMrWhite ? 'on' : 'off' }}.
        {{ config.mode === 'team' ? t('host.setup.hintTeam') : '' }}
      </p>
    </div>

    <p v-if="host.error" class="error" role="alert">{{ host.error }}</p>

    <div class="start rise" style="animation-delay: 170ms">
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

.error {
  color: var(--danger);
  font-weight: 700;
}

.start {
  margin-top: 20px;
}
</style>
