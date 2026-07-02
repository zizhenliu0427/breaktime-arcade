<script setup lang="ts">
import BaseButton from '../../components/ui/BaseButton.vue';
</script>

<template>
  <div class="page">
    <h1 class="rise">How to play</h1>

    <div class="card rise" style="animation-delay: 60ms">
      <ol class="steps">
        <li>
          <strong>See your word.</strong> Most players receive the same secret word; one player —
          the Undercover — receives a similar but different one. Nobody is told which they are.
        </li>
        <li>
          <strong>Give a clue.</strong> One at a time, say one short clue about your word. Don't
          say the word, spell it, give its first letter or translate it.
        </li>
        <li>
          <strong>Discuss.</strong> Talk about whose clue felt off. Keep it quick — around 45
          seconds.
        </li>
        <li>
          <strong>Vote.</strong> Everyone votes for the person they suspect. The player with the
          most votes is out, and their role is revealed.
        </li>
        <li>
          <strong>Win.</strong> Civilians win by voting out the Undercover. The Undercover wins by
          surviving until only one Civilian remains.
        </li>
      </ol>
      <p class="tip">
        💡 If the vote is tied, the tied players each give one more clue, then the others vote
        again — only between them.
      </p>
    </div>

    <div class="actions rise" style="animation-delay: 120ms">
      <router-link to="/undercover/pass-and-play">
        <BaseButton variant="accent" size="lg">Play now</BaseButton>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.steps {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 12px;
}

.tip {
  margin: 18px 0 0;
  background: var(--violet-050);
  border-radius: var(--radius-s);
  padding: 12px 14px;
  font-size: 0.92rem;
}

.actions {
  margin-top: 20px;
  text-align: center;
}

.actions a {
  text-decoration: none;
}
</style>
