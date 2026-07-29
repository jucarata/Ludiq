import { rollDicePair } from "@/lib/game/dice";

/**
 * Tutorial-only dice sequencer for `/tuto`.
 * 1) Player: never doubles
 * 2) Player: [2,2] exit + two moves on same piece → routeIndex 4
 * 3) Bot: doubles (exit on first turn)
 * 4) Player: [3,1] → from 4 to safe at routeIndex 8
 * After that: normal random dice
 */
export function createTutorialDiceBag(): () => [number, number] {
  let rollCount = 0;

  return () => {
    rollCount += 1;
    if (rollCount === 1) return [2, 5];
    if (rollCount === 2) return [2, 2];
    if (rollCount === 3) return [4, 4];
    if (rollCount === 4) return [3, 1];
    return rollDicePair();
  };
}
