import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROOM_CONFIG,
  generateRoomCode,
  GROUP_IDS,
  groupIdsFor,
  normaliseRoomCode,
  pickAutoGroup,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  seededRng,
} from '../src';

describe('room codes', () => {
  it('generates codes of the right length from the safe alphabet', () => {
    const rng = seededRng(42);
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode(rng);
      expect(code).toHaveLength(ROOM_CODE_LENGTH);
      for (const ch of code) expect(ROOM_CODE_ALPHABET).toContain(ch);
    }
  });

  it('normalises user input', () => {
    expect(normaliseRoomCode('  ab c9 2x ')).toBe('ABC92X');
  });
});

describe('groupIdsFor', () => {
  it('returns the configured number of groups, clamped to the GROUP_IDS ceiling', () => {
    expect(groupIdsFor({ groupCount: 4 })).toEqual(['A', 'B', 'C', 'D']);
    expect(groupIdsFor({ groupCount: 6 })).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(groupIdsFor({ groupCount: 99 })).toEqual([...GROUP_IDS]);
    expect(groupIdsFor({ groupCount: 0 })).toEqual(['A']);
  });
});

describe('pickAutoGroup', () => {
  const ids = ['A', 'B', 'C', 'D'];

  it('picks the emptiest group, earliest on ties', () => {
    expect(pickAutoGroup({}, ids, 6)).toBe('A');
    expect(pickAutoGroup({ A: 2, B: 1, C: 2, D: 1 }, ids, 6)).toBe('B');
    expect(pickAutoGroup({ A: 1, B: 1, C: 1, D: 1 }, ids, 6)).toBe('A');
  });

  it('skips full groups and returns null when everything is full', () => {
    expect(pickAutoGroup({ A: 6, B: 6, C: 5, D: 6 }, ids, 6)).toBe('C');
    expect(pickAutoGroup({ A: 6, B: 6, C: 6, D: 6 }, ids, 6)).toBeNull();
  });

  it('spreads a small class across groups so enough seats form to start', () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 3; i++) {
      const g = pickAutoGroup(counts, ids, DEFAULT_ROOM_CONFIG.groupSize)!;
      counts[g] = (counts[g] ?? 0) + 1;
    }
    expect(counts).toEqual({ A: 1, B: 1, C: 1 });
  });

  it('balances a stream of 24 joins into 6/6/6/6', () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 24; i++) {
      const g = pickAutoGroup(counts, ids, DEFAULT_ROOM_CONFIG.groupSize);
      expect(g).not.toBeNull();
      counts[g!] = (counts[g!] ?? 0) + 1;
    }
    expect(counts).toEqual({ A: 6, B: 6, C: 6, D: 6 });
  });
});
