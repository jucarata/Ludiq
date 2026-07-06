import type { PlayerColor } from "@/lib/board/types";

/** Duración de la celebración al meter una ficha en la casilla café (ms) */
export const FINISH_CELEBRATION_MS = 2000;

export interface CelebrationState {
  player: PlayerColor;
  /** Cambia en cada celebración — fuerza el reinicio de la animación */
  key: number;
}

export { playFinishSound } from "@/lib/game/sounds";
