import type { WordPack, WordPair, Rng } from '../types';
import { pick } from '../game/rng';
import { enEasy } from './en-easy';
import { enMedium } from './en-medium';

export { enEasy, enMedium };

export const wordPacks: WordPack[] = [enEasy, enMedium];

export function getWordPack(id: string): WordPack | undefined {
  return wordPacks.find((p) => p.id === id);
}

/** Pick a random pair, optionally excluding already-played pair ids. */
export function randomPair(
  pack: WordPack,
  exclude: readonly string[] = [],
  rng: Rng = Math.random,
): WordPair {
  const pool = pack.pairs.filter((p) => !exclude.includes(p.id));
  return pick(pool.length > 0 ? pool : pack.pairs, rng);
}
