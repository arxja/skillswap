import "server-only";

/**
 * Canonical key for a swap between two users involving two skills.
 *
 * A request from Ana -> You offering React for Spanish MUST produce
 * the same key as a request from You -> Ana offering Spanish for
 * React, so the partial unique index on Swap.pairKey can prevent
 * duplicate active swaps regardless of who initiated.
 *
x` * Achieves this by sorting each user/skill offer as a unit before joining.
 */
export function buildPairKey(
  userA: string,
  userB: string,
  skillA: string,
  skillB: string,
): string {
  const [[userLow, skillLow], [userHigh, skillHigh]] = [
    [userA, skillA],
    [userB, skillB],
  ].sort(([userLeft, skillLeft], [userRight, skillRight]) => {
    return (
      userLeft.localeCompare(userRight) || skillLeft.localeCompare(skillRight)
    );
  });

  return `${userLow}:${userHigh}:${skillLow}:${skillHigh}`;
}
