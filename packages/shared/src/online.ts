/**
 * Online Room shared types & pure helpers.
 *
 * Two game modes share one room model:
 * - `team`  : ONE game per room; each group is a seat, members share their
 *             group's word, groups speak/vote as one. `groupSize=1` collapses
 *             to "every player for themselves".
 * - `groups`: each group plays its OWN internal game (classic "1 undercover
 *             within the group"), N groups run in parallel.
 *
 * The engine (`shared/game/*`) is seat-abstract and reused by both. In team
 * mode the seat is the group; in groups mode the seat is a member. The room-
 * level game fields on `PublicRoomState` are used by team mode; the per-group
 * game fields on `PublicGroupState` are used by groups mode (null/0 otherwise).
 *
 * Secrets travel only via `you:secret` (per player) and `host:fullState`
 * (host socket only); the role is withheld from members so nobody can tell
 * whether they're on the undercover side.
 */
import type { LocalPhase, Rng, Role, Winner } from './types';

/* ── Config ──────────────────────────────────────────────────── */

export type GameMode = 'team' | 'groups';

export interface RoomConfig {
  sessionName: string;
  groupCount: number; // number of teams (1–6)
  groupSize: number; // max players per team (1–10); team mode: 1 = solo
  groupNames: string[]; // display name per team, defaults to ["1","2",…]
  mode: GameMode;
  packId: string;
  undercoverCount: number;
  includeMrWhite: boolean;
  discussSeconds: number;
  voteSeconds: number;
}

/** Recommended classroom defaults (product plan §14). */
export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  sessionName: 'PY Icebreaker',
  groupCount: 4,
  groupSize: 6,
  groupNames: ['Group 1', 'Group 2', 'Group 3', 'Group 4'],
  mode: 'team',
  packId: 'en-easy',
  undercoverCount: 1,
  includeMrWhite: false,
  discussSeconds: 45,
  voteSeconds: 20,
};

export const GROUP_IDS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export type GroupId = (typeof GROUP_IDS)[number];

export function groupIdsFor(config: Pick<RoomConfig, 'groupCount'>): GroupId[] {
  return GROUP_IDS.slice(0, Math.min(Math.max(config.groupCount, 1), GROUP_IDS.length));
}

/* ── Room code ───────────────────────────────────────────────── */

/** No 0/O/1/I/L — easy to read from a projector and type on a phone. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;

export function generateRoomCode(rng: Rng = Math.random): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(rng() * ROOM_CODE_ALPHABET.length)]!;
  }
  return code;
}

export function normaliseRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}

/* ── Auto grouping (product plan §6.1) ───────────────────────── */

/**
 * Pick the group a new player should auto-join: the emptiest group with a
 * free seat; ties resolve to the earliest group. Balancing keeps a small class
 * spread across enough groups to form multiple seats; at full turnout it lands
 * on even 6/6/6/6. Returns null if all full.
 */
export function pickAutoGroup(
  counts: Record<string, number>,
  groupIds: readonly string[],
  capacity: number,
): string | null {
  let best: string | null = null;
  let bestCount = Infinity;
  for (const id of groupIds) {
    const c = counts[id] ?? 0;
    if (c < capacity && c < bestCount) {
      best = id;
      bestCount = c;
    }
  }
  return best;
}

/* ── Public snapshots (safe to broadcast) ────────────────────── */

export interface PublicPlayer {
  id: string;
  name: string;
  groupId: string | null;
  connected: boolean;
  /** groups mode: is this member still in their group's game (team mode: true). */
  alive: boolean;
}

export interface PublicGroupState {
  id: string; // group id == team-mode seat id
  name: string; // display name (config.groupNames)
  playerCount: number;
  memberIds: string[];
  readyMemberIds: string[];
  /** team mode: is this seat still in the game. */
  alive: boolean;

  /* groups mode: this group's internal game (null/0 in team mode). */
  phase: LocalPhase | null;
  round: number;
  /** Member ids in speaking order. */
  speakingOrder: string[];
  currentSpeakerId: string | null;
  speakerIndex: number;
  votesIn: number;
  votersTotal: number;
  runoffCandidateIds: string[] | null;
  isRunoffVote: boolean;
  phaseEndsAt: number | null;
  lastElimination: { playerId: string; role: Role } | null;
  winner: Winner | null;
  revealedRoles: Record<string, Role> | null;
  civilianWord: string | null;
  undercoverWord: string | null;
}

export interface PublicRoomState {
  code: string;
  config: RoomConfig;
  players: PublicPlayer[];
  groups: Record<string, PublicGroupState>;
  started: boolean;

  /* team mode: one game at the room level (null/0 in groups mode). */
  phase: LocalPhase | null;
  round: number;
  speakingOrder: string[]; // group ids
  speakerIndex: number;
  currentSpeakerGroupId: string | null;
  votesIn: number;
  votersTotal: number;
  runoffCandidateIds: string[] | null;
  isRunoffVote: boolean;
  phaseEndsAt: number | null;
  lastElimination: { groupId: string; role: Role } | null;
  winner: Winner | null;
  revealedRoles: Record<string, Role> | null;
  civilianWord: string | null;
  undercoverWord: string | null;
}

/* ── Host-only & player-only payloads ────────────────────────── */

/** team mode: one word pair + role per group. */
export interface TeamSecrets {
  kind: 'team';
  civilianWord: string;
  undercoverWord: string;
  roles: Record<string, Role>; // groupId -> role
}

/** groups mode: per-group word pair + role per member. */
export interface GroupsSecrets {
  kind: 'groups';
  groups: Record<string, { civilianWord: string; undercoverWord: string; roles: Record<string, Role> } | null>;
}

export type HostSecrets = TeamSecrets | GroupsSecrets;

export interface HostState {
  room: PublicRoomState;
  secrets: HostSecrets | null;
}

export interface SecretPayload {
  groupId: string;
  round: number;
  /** team: the group's shared word; groups: this member's word. Role withheld. */
  word: string | null;
}

/* ── Host actions ────────────────────────────────────────────── */
/* groupId is required for the per-group actions in `groups` mode (skip/next/
   restart on one group); omitted in `team` mode (one game). */
export type HostAction =
  | { type: 'startGame' }
  | { type: 'skipPhase'; groupId?: string }
  | { type: 'nextRound'; groupId?: string }
  | { type: 'restartGame'; groupId?: string }
  | { type: 'endRoom' };
