import type { LocalPlayer, Rng } from '../types';
import { shuffle } from './rng';

/**
 * Speaking order for a round: alive players, shuffled.
 * House rule: Mr White never speaks first (he has no word to riff on).
 */
export function speakingOrder(players: readonly LocalPlayer[], rng: Rng): string[] {
  const alive = players.filter((p) => p.alive);
  let order = shuffle(alive, rng);
  if (order.length > 1 && order[0]!.role === 'mrWhite') {
    const swapWith = 1 + Math.floor(rng() * (order.length - 1));
    order = [...order];
    [order[0], order[swapWith]] = [order[swapWith]!, order[0]!];
  }
  return order.map((p) => p.id);
}
