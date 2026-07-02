import type { LocalPlayer, Winner } from '../types';

/**
 * Win conditions (see product plan §8.7):
 * - Civilians win once every undercover (and Mr White) is out.
 * - Undercover wins when as many (or more) impostors as civilians remain —
 *   for one undercover that is the classic "undercover + one civilian left".
 */
export function checkOutcome(players: readonly LocalPlayer[]): Winner | null {
  const alive = players.filter((p) => p.alive);
  const undercover = alive.filter((p) => p.role === 'undercover').length;
  const mrWhite = alive.filter((p) => p.role === 'mrWhite').length;
  const civilians = alive.length - undercover - mrWhite;

  if (undercover + mrWhite === 0) return 'civilians';
  if (civilians <= undercover + mrWhite) {
    return undercover > 0 ? 'undercover' : 'mrWhite';
  }
  return null;
}
