/** Core shared types for Breaktime Arcade games. Pure TS — no framework, no network. */

export type Role = 'civilian' | 'undercover' | 'mrWhite';

export type Winner = 'civilians' | 'undercover' | 'mrWhite';

export type LocalPhase =
  | 'reveal'      // players take turns viewing their secret word (Pass & Play)
  | 'clue'        // spoken clues, one player at a time, in order
  | 'discuss'     // open discussion, timed
  | 'vote'        // each alive player votes for another
  | 'runoff'      // tie-break: tied players clue again, others revote
  | 'elimination' // show who was voted out (role only, not word)
  | 'ended';      // winner decided, full words revealed

export interface WordPair {
  id: string;
  category: string;
  civilian: string;
  undercover: string;
}

export interface WordPack {
  id: string;
  locale: 'en';
  difficulty: 'easy' | 'medium';
  name: string;
  pairs: WordPair[];
}

export interface LocalPlayer {
  id: string;
  name: string;
  role: Role;
  /** The player's secret word; null for Mr White. */
  word: string | null;
  alive: boolean;
}

export interface LocalGameConfig {
  playerNames: string[];
  wordPair: WordPair;
  undercoverCount: number;
  includeMrWhite: boolean;
  discussSeconds: number;
  voteSeconds: number;
}

export interface Elimination {
  playerId: string;
  role: Role;
}

export interface LocalGame {
  config: LocalGameConfig;
  players: LocalPlayer[];
  phase: LocalPhase;
  round: number;
  /** Index into `players` of whoever should view their word next (reveal phase). */
  revealIndex: number;
  /** Player ids in speaking order for the current round (alive players only). */
  speakingOrder: string[];
  /** Index into `speakingOrder` of the current speaker (clue phase). */
  speakerIndex: number;
  /** voterId -> targetId for the current vote. */
  votes: Record<string, string>;
  /** Tied player ids when in runoff, otherwise null. */
  runoffCandidates: string[] | null;
  /** True when the current vote is the runoff revote (a second tie eliminates nobody). */
  isRunoffVote: boolean;
  lastElimination: Elimination | null;
  winner: Winner | null;
}

/** Random source — inject a seeded rng in tests, Math.random in production. */
export type Rng = () => number;
