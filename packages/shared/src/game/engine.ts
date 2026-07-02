import type { LocalGame, LocalGameConfig, Rng } from '../types';
import { assignRoles } from './roles';
import { speakingOrder } from './order';
import { tallyVotes } from './voting';
import { checkOutcome } from './outcome';

/**
 * Pure state machine for a local (Pass & Play) round of Who's Undercover?.
 * Every transition returns a new LocalGame — no mutation, no I/O, no timers.
 * The UI owns the clock; the engine owns the rules.
 */

export function createGame(config: LocalGameConfig, rng: Rng = Math.random): LocalGame {
  return {
    config,
    players: assignRoles(config, rng),
    phase: 'reveal',
    round: 1,
    revealIndex: 0,
    speakingOrder: [],
    speakerIndex: 0,
    votes: {},
    runoffCandidates: null,
    isRunoffVote: false,
    lastElimination: null,
    winner: null,
  };
}

/** Reveal phase: the current player has seen their word; move to the next. */
export function confirmReveal(game: LocalGame, rng: Rng = Math.random): LocalGame {
  if (game.phase !== 'reveal') return game;
  const next = game.revealIndex + 1;
  if (next < game.players.length) {
    return { ...game, revealIndex: next };
  }
  return startClueRound({ ...game, revealIndex: next }, rng);
}

function startClueRound(game: LocalGame, rng: Rng): LocalGame {
  return {
    ...game,
    phase: 'clue',
    speakingOrder: speakingOrder(game.players, rng),
    speakerIndex: 0,
    votes: {},
    runoffCandidates: null,
    isRunoffVote: false,
  };
}

/** Clue phase: current speaker has given their clue. */
export function nextSpeaker(game: LocalGame): LocalGame {
  if (game.phase !== 'clue' && game.phase !== 'runoff') return game;
  const order = game.runoffCandidates ?? game.speakingOrder;
  const next = game.speakerIndex + 1;
  if (next < order.length) {
    return { ...game, speakerIndex: next };
  }
  // Runoff clues go straight back to voting; a normal round discusses first.
  return game.phase === 'runoff'
    ? { ...game, phase: 'vote', votes: {}, isRunoffVote: true }
    : { ...game, phase: 'discuss' };
}

export function startVoting(game: LocalGame): LocalGame {
  if (game.phase !== 'discuss') return game;
  return { ...game, phase: 'vote', votes: {} };
}

/** Ids of players who vote in the current ballot. */
export function eligibleVoters(game: LocalGame): string[] {
  const alive = game.players.filter((p) => p.alive).map((p) => p.id);
  if (game.isRunoffVote && game.runoffCandidates) {
    return alive.filter((id) => !game.runoffCandidates!.includes(id));
  }
  return alive;
}

/** Ids of players who may be voted for in the current ballot. */
export function eligibleTargets(game: LocalGame, voterId: string): string[] {
  const alive = game.players.filter((p) => p.alive).map((p) => p.id);
  const pool = game.isRunoffVote && game.runoffCandidates ? game.runoffCandidates : alive;
  return pool.filter((id) => id !== voterId);
}

export function castVote(game: LocalGame, voterId: string, targetId: string): LocalGame {
  if (game.phase !== 'vote') return game;
  if (!eligibleVoters(game).includes(voterId)) return game;
  if (!eligibleTargets(game, voterId).includes(targetId)) return game;
  return { ...game, votes: { ...game.votes, [voterId]: targetId } };
}

export function allVotesIn(game: LocalGame): boolean {
  return eligibleVoters(game).every((id) => game.votes[id] !== undefined);
}

/**
 * Resolve the ballot (product plan §8.6):
 * - clear winner → elimination;
 * - first tie → tied players give a new clue, the others revote among them;
 * - tie again → nobody is eliminated this round.
 */
export function resolveVotes(game: LocalGame): LocalGame {
  if (game.phase !== 'vote') return game;
  const { top } = tallyVotes(game.votes);

  if (top.length === 1) {
    return eliminate(game, top[0]!);
  }
  if (!game.isRunoffVote && top.length > 1) {
    return {
      ...game,
      phase: 'runoff',
      runoffCandidates: top,
      speakerIndex: 0,
      votes: {},
      isRunoffVote: false,
    };
  }
  // Second tie (or an empty ballot): no elimination this round.
  return { ...game, phase: 'elimination', lastElimination: null };
}

function eliminate(game: LocalGame, playerId: string): LocalGame {
  const players = game.players.map((p) => (p.id === playerId ? { ...p, alive: false } : p));
  const eliminated = players.find((p) => p.id === playerId)!;
  const withElim: LocalGame = {
    ...game,
    players,
    phase: 'elimination',
    lastElimination: { playerId, role: eliminated.role },
  };
  const winner = checkOutcome(players);
  return winner ? { ...withElim, phase: 'ended', winner } : withElim;
}

/** After showing the elimination result, either end the game or start the next round. */
export function nextRound(game: LocalGame, rng: Rng = Math.random): LocalGame {
  if (game.phase !== 'elimination') return game;
  const winner = checkOutcome(game.players);
  if (winner) return { ...game, phase: 'ended', winner };
  return startClueRound({ ...game, round: game.round + 1, lastElimination: null }, rng);
}
