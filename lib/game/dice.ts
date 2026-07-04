export const DICE_ROLL_DURATION_MS = 1200;
export const DICE_RESULT_HOLD_MS = 900;

export function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}
