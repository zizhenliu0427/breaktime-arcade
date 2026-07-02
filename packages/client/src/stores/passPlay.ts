import { defineStore } from 'pinia';
import {
  createGame,
  confirmReveal,
  nextSpeaker,
  startVoting,
  castVote,
  resolveVotes,
  nextRound,
  eligibleVoters,
  eligibleTargets,
  getWordPack,
  randomPair,
  type LocalGame,
  type LocalPlayer,
} from '@arcade/shared';

/**
 * Pass & Play session state. Lives in memory only — deliberately not persisted,
 * so a refresh can never re-show a previous player's secret word (§23).
 */
interface PassPlayState {
  game: LocalGame | null;
  packId: string;
  /** Pair ids already played this session (avoids repeats on Play again). */
  usedPairIds: string[];
  /** Handover privacy step: true while the "pass the device to X" mask is up. */
  masked: boolean;
  /** Index into eligibleVoters for the pass-around ballot. */
  voterIndex: number;
}

export const usePassPlayStore = defineStore('passPlay', {
  state: (): PassPlayState => ({
    game: null,
    packId: 'en-easy',
    usedPairIds: [],
    masked: true,
    voterIndex: 0,
  }),

  getters: {
    phase: (s) => s.game?.phase ?? null,

    players: (s): LocalPlayer[] => s.game?.players ?? [],

    alivePlayers(): LocalPlayer[] {
      return this.players.filter((p) => p.alive);
    },

    playerById() {
      const map = new Map(this.players.map((p) => [p.id, p]));
      return (id: string) => map.get(id);
    },

    /** Player currently viewing their word during the reveal phase. */
    revealPlayer(): LocalPlayer | null {
      const g = this.game;
      if (!g || g.phase !== 'reveal') return null;
      return g.players[g.revealIndex] ?? null;
    },

    /** Speaking order (normal round or runoff candidates). */
    clueOrder(): LocalPlayer[] {
      const g = this.game;
      if (!g) return [];
      const ids = g.phase === 'runoff' && g.runoffCandidates ? g.runoffCandidates : g.speakingOrder;
      return ids.map((id) => this.playerById(id)).filter((p): p is LocalPlayer => !!p);
    },

    currentSpeaker(): LocalPlayer | null {
      const g = this.game;
      if (!g || (g.phase !== 'clue' && g.phase !== 'runoff')) return null;
      return this.clueOrder[g.speakerIndex] ?? null;
    },

    voters(): LocalPlayer[] {
      const g = this.game;
      if (!g) return [];
      return eligibleVoters(g)
        .map((id) => this.playerById(id))
        .filter((p): p is LocalPlayer => !!p);
    },

    currentVoter(): LocalPlayer | null {
      if (this.phase !== 'vote') return null;
      return this.voters[this.voterIndex] ?? null;
    },

    currentTargets(): LocalPlayer[] {
      const g = this.game;
      const voter = this.currentVoter;
      if (!g || !voter) return [];
      return eligibleTargets(g, voter.id)
        .map((id) => this.playerById(id))
        .filter((p): p is LocalPlayer => !!p);
    },

    eliminatedPlayer(): LocalPlayer | null {
      const elim = this.game?.lastElimination;
      return elim ? (this.playerById(elim.playerId) ?? null) : null;
    },
  },

  actions: {
    startGame(names: string[], packId: string) {
      const pack = getWordPack(packId) ?? getWordPack('en-easy')!;
      const pair = randomPair(pack, this.usedPairIds);
      this.packId = pack.id;
      this.usedPairIds.push(pair.id);
      this.game = createGame({
        playerNames: names,
        wordPair: pair,
        undercoverCount: 1,
        includeMrWhite: false,
        discussSeconds: 45,
        voteSeconds: 20,
      });
      this.masked = true;
      this.voterIndex = 0;
    },

    /** Same group, fresh word pair. */
    playAgain() {
      if (!this.game) return;
      this.startGame(
        this.game.players.map((p) => p.name),
        this.packId,
      );
    },

    quit() {
      this.game = null;
    },

    unmask() {
      this.masked = false;
    },

    finishReveal() {
      if (!this.game) return;
      this.game = confirmReveal(this.game);
      this.masked = true;
    },

    advanceSpeaker() {
      if (!this.game) return;
      const wasRunoff = this.game.phase === 'runoff';
      this.game = nextSpeaker(this.game);
      // A runoff flows straight into its revote — reset the ballot walk.
      if (wasRunoff && this.game.phase === 'vote') {
        this.voterIndex = 0;
        this.masked = true;
      }
    },

    beginVoting() {
      if (!this.game) return;
      this.game = startVoting(this.game);
      this.voterIndex = 0;
      this.masked = true;
    },

    submitVote(targetId: string) {
      if (!this.game) return;
      const voter = this.currentVoter;
      if (!voter) return;
      this.game = castVote(this.game, voter.id, targetId);
      if (this.voterIndex + 1 < this.voters.length) {
        this.voterIndex += 1;
        this.masked = true;
      } else {
        this.game = resolveVotes(this.game);
        this.masked = true;
      }
    },

    continueAfterElimination() {
      if (!this.game) return;
      this.game = nextRound(this.game);
      this.masked = true;
    },
  },
});
