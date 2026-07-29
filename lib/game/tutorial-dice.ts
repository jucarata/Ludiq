import { rollDicePair } from "@/lib/game/dice";

/**
 * Tutorial-only dice sequencer for `/tuto`.
 * 1) Player: never doubles (retry lesson)
 * 2) Player: [2,2] exit — one piece advances to 4, one stays at exit (0)
 * 3) Bot: [6,6] exit + same piece → routeIndex 12
 * 4) Bot: [6,6] same lead piece → routeIndex 24 (exactly 2 ahead of exit piece)
 * 5) Player: [2,3] — use 2 to capture from exit, then free 3
 * After that: normal random dice
 */
export function createTutorialDiceBag(): () => [number, number] {
  let rollCount = 0;

  return () => {
    rollCount += 1;
    if (rollCount === 1) return [2, 5];
    if (rollCount === 2) return [2, 2];
    if (rollCount === 3) return [6, 6];
    if (rollCount === 4) return [6, 6];
    if (rollCount === 5) return [2, 3];
    return rollDicePair();
  };
}
