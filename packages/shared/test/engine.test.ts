import { describe, it, expect } from 'vitest';
import {
  createGame,
  confirmReveal,
  nextSpeaker,
  startVoting,
  castVote,
  allVotesIn,
  resolveVotes,
  nextRound,
  eligibleVoters,
  eligibleTargets,
  seededRng,
  checkOutcome,
  tallyVotes,
  assignRoles,
  speakingOrder,
  enEasy,
} from '../src';
import type { LocalGame, LocalGameConfig } from '../src';

const baseConfig: LocalGameConfig = {
  playerNames: ['Alex', 'Blake', 'Casey', 'Dana', 'Ellis', 'Finley'],
  wordPair: enEasy.pairs[0]!,
  undercoverCount: 1,
  includeMrWhite: false,
  discussSeconds: 45,
  voteSeconds: 20,
};

function freshGame(seed = 42): LocalGame {
  return createGame(baseConfig, seededRng(seed));
}

/** Walk a game from reveal to the first vote phase. */
function toVotePhase(game: LocalGame, seed = 7): LocalGame {
  const rng = seededRng(seed);
  let g = game;
  while (g.phase === 'reveal') g = confirmReveal(g, rng);
  while (g.phase === 'clue') g = nextSpeaker(g);
  g = startVoting(g);
  return g;
}

describe('assignRoles', () => {
  it('assigns exactly one undercover for the default config', () => {
    const players = assignRoles(baseConfig, seededRng(1));
    expect(players).toHaveLength(6);
    expect(players.filter((p) => p.role === 'undercover')).toHaveLength(1);
    expect(players.filter((p) => p.role === 'civilian')).toHaveLength(5);
  });

  it('gives civilians one word and the undercover the other', () => {
    const players = assignRoles(baseConfig, seededRng(1));
    const civWords = new Set(players.filter((p) => p.role === 'civilian').map((p) => p.word));
    const ucWord = players.find((p) => p.role === 'undercover')!.word;
    expect(civWords.size).toBe(1);
    expect(ucWord).not.toBe([...civWords][0]);
    const pairWords = [baseConfig.wordPair.civilian, baseConfig.wordPair.undercover];
    expect(pairWords).toContain(ucWord);
    expect(pairWords).toContain([...civWords][0]);
  });

  it('sometimes swaps which side of the pair civilians receive', () => {
    const seen = new Set<string>();
    for (let s = 0; s < 40; s++) {
      const players = assignRoles(baseConfig, seededRng(s));
      seen.add(players.find((p) => p.role === 'civilian')!.word!);
    }
    expect(seen.size).toBe(2);
  });

  it('rejects groups that are too small', () => {
    expect(() =>
      assignRoles({ ...baseConfig, playerNames: ['A', 'B'] }, seededRng(1)),
    ).toThrow();
  });

  it('gives Mr White no word when enabled', () => {
    const players = assignRoles({ ...baseConfig, includeMrWhite: true }, seededRng(3));
    const mrWhite = players.filter((p) => p.role === 'mrWhite');
    expect(mrWhite).toHaveLength(1);
    expect(mrWhite[0]!.word).toBeNull();
  });
});

describe('speakingOrder', () => {
  it('includes every alive player exactly once', () => {
    const players = assignRoles(baseConfig, seededRng(2));
    const order = speakingOrder(players, seededRng(2));
    expect([...order].sort()).toEqual(players.map((p) => p.id).sort());
  });

  it('never puts Mr White first', () => {
    const players = assignRoles({ ...baseConfig, includeMrWhite: true }, seededRng(5));
    for (let s = 0; s < 50; s++) {
      const order = speakingOrder(players, seededRng(s));
      const first = players.find((p) => p.id === order[0])!;
      expect(first.role).not.toBe('mrWhite');
    }
  });

  it('excludes eliminated players', () => {
    const players = assignRoles(baseConfig, seededRng(2)).map((p, i) =>
      i === 0 ? { ...p, alive: false } : p,
    );
    const order = speakingOrder(players, seededRng(2));
    expect(order).toHaveLength(5);
    expect(order).not.toContain(players[0]!.id);
  });
});

describe('reveal phase', () => {
  it('walks through every player then enters the clue phase', () => {
    const rng = seededRng(9);
    let g = freshGame();
    expect(g.phase).toBe('reveal');
    for (let i = 0; i < 6; i++) {
      expect(g.revealIndex).toBe(i);
      g = confirmReveal(g, rng);
    }
    expect(g.phase).toBe('clue');
    expect(g.speakingOrder).toHaveLength(6);
  });
});

describe('voting', () => {
  it('tallies and finds the top target', () => {
    const { counts, top } = tallyVotes({ a: 'x', b: 'x', c: 'y' });
    expect(counts).toEqual({ x: 2, y: 1 });
    expect(top).toEqual(['x']);
  });

  it('rejects self-votes and votes from the dead', () => {
    let g = toVotePhase(freshGame());
    const voter = eligibleVoters(g)[0]!;
    const before = g;
    g = castVote(g, voter, voter);
    expect(g).toBe(before); // self-vote ignored
  });

  it('eliminates the clear top target and reveals the role', () => {
    let g = toVotePhase(freshGame());
    const voters = eligibleVoters(g);
    const target = eligibleTargets(g, voters[0]!)[0]!;
    for (const v of voters) {
      g = castVote(g, v, v === target ? eligibleTargets(g, v)[0]! : target);
    }
    expect(allVotesIn(g)).toBe(true);
    g = resolveVotes(g);
    expect(['elimination', 'ended']).toContain(g.phase);
    const eliminated = g.players.find((p) => !p.alive);
    expect(eliminated).toBeDefined();
    expect(g.lastElimination?.playerId).toBe(eliminated!.id);
  });
});

describe('tie handling (§8.6)', () => {
  function forceTie(g: LocalGame): LocalGame {
    // 6 voters split 3–3 between two targets.
    const voters = eligibleVoters(g);
    const [t1, t2] = [voters[0]!, voters[1]!];
    for (const [i, v] of voters.entries()) {
      const target = i % 2 === 0 ? t1 : t2;
      g = castVote(g, v, target === v ? (i % 2 === 0 ? t2 : t1) : target);
    }
    return resolveVotes(g);
  }

  it('first tie moves to a runoff among the tied players', () => {
    const g = forceTie(toVotePhase(freshGame()));
    expect(g.phase).toBe('runoff');
    expect(g.runoffCandidates!.length).toBeGreaterThanOrEqual(2);
  });

  it('runoff voters exclude the tied players; targets are only the tied', () => {
    let g = forceTie(toVotePhase(freshGame()));
    while (g.phase === 'runoff') g = nextSpeaker(g);
    expect(g.phase).toBe('vote');
    expect(g.isRunoffVote).toBe(true);
    const voters = eligibleVoters(g);
    for (const v of voters) expect(g.runoffCandidates).not.toContain(v);
    expect(eligibleTargets(g, voters[0]!)).toEqual(g.runoffCandidates);
  });

  it('a second tie eliminates nobody', () => {
    let g = forceTie(toVotePhase(freshGame()));
    while (g.phase === 'runoff') g = nextSpeaker(g);
    const voters = eligibleVoters(g);
    const [c1, c2] = g.runoffCandidates!;
    for (const [i, v] of voters.entries()) g = castVote(g, v, i % 2 === 0 ? c1! : c2!);
    g = resolveVotes(g);
    expect(g.phase).toBe('elimination');
    expect(g.lastElimination).toBeNull();
    expect(g.players.every((p) => p.alive)).toBe(true);
  });
});

describe('outcome (§8.7)', () => {
  it('civilians win when the undercover is out', () => {
    const players = assignRoles(baseConfig, seededRng(4)).map((p) =>
      p.role === 'undercover' ? { ...p, alive: false } : p,
    );
    expect(checkOutcome(players)).toBe('civilians');
  });

  it('undercover wins at undercover + one civilian', () => {
    const players = assignRoles(baseConfig, seededRng(4));
    const civilians = players.filter((p) => p.role === 'civilian');
    const reduced = players.map((p) =>
      p.role === 'civilian' && p.id !== civilians[0]!.id ? { ...p, alive: false } : p,
    );
    expect(checkOutcome(reduced)).toBe('undercover');
  });

  it('game continues otherwise', () => {
    expect(checkOutcome(assignRoles(baseConfig, seededRng(4)))).toBeNull();
  });
});

describe('full round loop', () => {
  it('a full game reaches an end state', () => {
    const rng = seededRng(11);
    let g = freshGame(11);
    while (g.phase === 'reveal') g = confirmReveal(g, rng);
    let guard = 0;
    while (g.phase !== 'ended' && guard++ < 100) {
      while (g.phase === 'clue' || g.phase === 'runoff') g = nextSpeaker(g);
      if (g.phase === 'discuss') g = startVoting(g);
      if (g.phase === 'vote') {
        // Everyone votes for the first eligible target — deterministic.
        for (const v of eligibleVoters(g)) g = castVote(g, v, eligibleTargets(g, v)[0]!);
        g = resolveVotes(g);
      }
      if (g.phase === 'elimination') g = nextRound(g, rng);
    }
    expect(g.phase).toBe('ended');
    expect(g.winner).not.toBeNull();
  });
});
