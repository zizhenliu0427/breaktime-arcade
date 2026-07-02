<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { normaliseRoomCode, ROOM_CODE_LENGTH } from '@arcade/shared';
import BaseButton from '../components/ui/BaseButton.vue';
import { useOnlinePlayerStore } from '../stores/onlinePlayer';

const route = useRoute();
const router = useRouter();
const player = useOnlinePlayerStore();

const code = ref(normaliseRoomCode(String(route.params.code ?? '')));
const name = ref('');
const joining = ref(false);
const error = ref('');

onMounted(async () => {
  // A stored session (refresh / reopened phone) goes straight back to the game.
  if (await player.rejoin()) router.replace('/play');
});

async function join() {
  const roomCode = normaliseRoomCode(code.value);
  if (roomCode.length !== ROOM_CODE_LENGTH) {
    error.value = `The room code is ${ROOM_CODE_LENGTH} characters.`;
    return;
  }
  if (!name.value.trim()) {
    error.value = 'Please enter your name.';
    return;
  }
  joining.value = true;
  error.value = '';
  try {
    await player.join(roomCode, name.value.trim());
    router.push('/play');
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    joining.value = false;
  }
}
</script>

<template>
  <div class="page join">
    <h1 class="rise">🎟 Join a game</h1>
    <p class="sub rise" style="animation-delay: 50ms">
      Enter the room code on the screen, pick your name, and you're in.
    </p>

    <form class="card rise" style="animation-delay: 90ms" @submit.prevent="join">
      <label class="field">
        <span>Room code</span>
        <input
          v-model="code"
          class="code-input"
          type="text"
          :maxlength="ROOM_CODE_LENGTH"
          autocapitalize="characters"
          autocomplete="off"
          spellcheck="false"
          placeholder="ABC123"
          @input="code = normaliseRoomCode(code)"
        />
      </label>
      <label class="field">
        <span>Your name</span>
        <input v-model="name" type="text" maxlength="20" autocomplete="off" placeholder="e.g. Jamie" />
      </label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <BaseButton type="submit" variant="accent" size="lg" block :disabled="joining">
        {{ joining ? 'Joining…' : 'Join room' }}
      </BaseButton>
    </form>
  </div>
</template>

<style scoped>
.join {
  max-width: 480px;
}

.sub {
  color: var(--ink-soft);
  margin-bottom: 20px;
}

.card {
  display: grid;
  gap: 14px;
}

.field {
  display: grid;
  gap: 4px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ink-soft);
}

.field input {
  border: 2px solid var(--line);
  border-radius: var(--radius-m);
  padding: 12px 14px;
  font-size: 1.05rem;
  transition: border-color var(--t-fast);
}

.field input:focus {
  outline: none;
  border-color: var(--violet-600);
}

.code-input {
  text-transform: uppercase;
  letter-spacing: 0.3em;
  font-weight: 800;
  font-size: 1.4rem !important;
  text-align: center;
}

.error {
  color: var(--danger);
  margin: 0;
  font-weight: 700;
}
</style>
