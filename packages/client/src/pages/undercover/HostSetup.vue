<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { DEFAULT_ROOM_CONFIG, wordPacks } from '@arcade/shared';
import BaseButton from '../../components/ui/BaseButton.vue';
import { useOnlineHostStore } from '../../stores/onlineHost';

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
    <h1 class="rise">📡 Host a Live Room</h1>
    <p class="sub rise" style="animation-delay: 50ms">
      Players join from their phones with a room code or QR code. You control everything from
      this computer.
    </p>

    <div class="card rise" style="animation-delay: 90ms">
      <h2>Session</h2>
      <label class="field">
        <span>Session name</span>
        <input v-model="config.sessionName" type="text" maxlength="40" />
      </label>
      <div class="row">
        <label class="field">
          <span>Teams</span>
          <select v-model.number="config.groupCount">
            <option v-for="n in 6" :key="n" :value="n">{{ n }}</option>
          </select>
        </label>
        <label class="field">
          <span>Players per team</span>
          <select v-model.number="config.groupSize">
            <option v-for="n in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]" :key="n" :value="n">{{ n }}</option>
          </select>
        </label>
      </div>
    </div>

    <div class="card rise" style="animation-delay: 130ms">
      <h2>Game</h2>
      <div class="row">
        <label class="field">
          <span>Mode</span>
          <select v-model="config.mode">
            <option value="team">Teams vs teams (whole class, one game)</option>
            <option value="groups">Each group plays its own game</option>
          </select>
        </label>
        <label class="field">
          <span>Word pack</span>
          <select v-model="config.packId">
            <option v-for="pack in wordPacks" :key="pack.id" :value="pack.id">
              {{ pack.name }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>Discussion timer</span>
          <select v-model.number="config.discussSeconds">
            <option v-for="s in [30, 45, 60, 90, 120]" :key="s" :value="s">{{ s }}s</option>
          </select>
        </label>
        <label class="field">
          <span>Voting timer</span>
          <select v-model.number="config.voteSeconds">
            <option v-for="s in [15, 20, 30, 45, 60]" :key="s" :value="s">{{ s }}s</option>
          </select>
        </label>
      </div>
      <label class="toggle">
        <input v-model="config.includeMrWhite" type="checkbox" />
        <span>Include Mr White</span>
        <span class="toggle-hint">One player gets no word at all and must bluff their way through.</span>
      </label>
      <p class="hint">
        1 undercover {{ config.mode === 'team' ? 'team' : 'player' }} ·
        Mr White {{ config.includeMrWhite ? 'on' : 'off' }}.
        {{ config.mode === 'team' ? 'Tip: set "Players per team = 1" to play every player for themselves.' : '' }}
      </p>
    </div>

    <p v-if="host.error" class="error" role="alert">{{ host.error }}</p>

    <div class="start rise" style="animation-delay: 170ms">
      <BaseButton variant="accent" size="lg" block :disabled="creating" @click="create">
        {{ creating ? 'Creating room…' : 'Create room' }}
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
