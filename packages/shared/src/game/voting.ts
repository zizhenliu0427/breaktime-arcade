export interface VoteTally {
  /** targetId -> number of votes received. */
  counts: Record<string, number>;
  /** Player ids tied for the most votes (empty if no votes were cast). */
  top: string[];
}

export function tallyVotes(votes: Record<string, string>): VoteTally {
  const counts: Record<string, number> = {};
  for (const target of Object.values(votes)) {
    counts[target] = (counts[target] ?? 0) + 1;
  }
  let max = 0;
  for (const c of Object.values(counts)) max = Math.max(max, c);
  const top = Object.keys(counts).filter((id) => counts[id] === max && max > 0);
  return { counts, top };
}
