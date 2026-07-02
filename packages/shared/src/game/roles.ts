import type { LocalGameConfig, LocalPlayer, Rng, Role } from '../types';
import { shuffle } from './rng';

/**
 * Assign roles and secret words. The civilian/undercover word sides are also
 * swapped at random so the "left" word in a pack is not always the civilian one.
 */
export function assignRoles(config: LocalGameConfig, rng: Rng): LocalPlayer[] {
  const { playerNames, wordPair, undercoverCount, includeMrWhite } = config;
  const n = playerNames.length;
  const specials = undercoverCount + (includeMrWhite ? 1 : 0);
  if (n < 2) throw new Error('At least 2 players are required');
  if (specials >= n - 1) throw new Error('Too many special roles for this group size');

  const swap = rng() < 0.5;
  const civilianWord = swap ? wordPair.undercover : wordPair.civilian;
  const undercoverWord = swap ? wordPair.civilian : wordPair.undercover;

  const roles: Role[] = [
    ...Array<Role>(undercoverCount).fill('undercover'),
    ...(includeMrWhite ? (['mrWhite'] as Role[]) : []),
  ];
  while (roles.length < n) roles.push('civilian');
  const shuffled = shuffle(roles, rng);

  return playerNames.map((name, i) => {
    const role = shuffled[i]!;
    return {
      id: `p${i + 1}`,
      name: name.trim(),
      role,
      word: role === 'mrWhite' ? null : role === 'civilian' ? civilianWord : undercoverWord,
      alive: true,
    };
  });
}
