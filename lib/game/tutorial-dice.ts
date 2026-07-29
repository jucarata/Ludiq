import { rollDicePair } from "@/lib/game/dice";

/**
 * Tutorial-only dice sequencer for `/tuto`.
 * 1) Player: never doubles (retry lesson)
 * 2) Player: [2,2] exit — one piece to 4, one stays at exit (0)
 * 3) Bot turn 1: [6,6] exit + same piece → routeIndex 12
 * 4) Player: [3,1] → lead piece to SAFE at routeIndex 8
 * 5) Bot turn 2: [6,6] same lead → routeIndex 24 (2 ahead of exit piece)
 * 6) Player: [2,3] — use 2 to capture from exit, then free 3
 * After that: normal random dice
 */
export function createTutorialDiceBag(): () => [number, number] {
  let rollCount = 0;

  return () => {
    rollCount += 1;
    if (rollCount === 1) return [2, 5];
    if (rollCount === 2) return [2, 2];
    if (rollCount === 3) return [6, 6];
    if (rollCount === 4) return [3, 1];
    if (rollCount === 5) return [6, 6];
    if (rollCount === 6) return [2, 3];
    return rollDicePair();
  };
}
