import type { LocalPlayer, Rng } from '../types';

/**
 * Speaking order for a round: keep the natural seat order (the order players
 * were seated / joined) and only rotate it by a random start. This matches the
 * mainstream "random start + clockwise" rule — neighbours always speak next to
 * each other, everyone takes turns at going first. Mr White may land first.
 */
export function speakingOrder(players: readonly LocalPlayer[], rng: Rng): string[] {
  const alive = players.filter((p) => p.alive);
  if (alive.length === 0) return [];
  const start = Math.floor(rng() * alive.length);
  return [...alive.slice(start), ...alive.slice(0, start)].map((p) => p.id);
}
