import { VICTORY_CELL_ANCHOR } from "./cell-placements";
import type { PlayerColor } from "./types";

/**
 * Casilla del recorrido: ancla lógica + mitad (solo esquinas).
 * Cada esquina 2×2 se divide en dos triángulos y cada uno es un paso.
 */
export interface RouteCell {
  anchor: number;
  /** Triángulo esquinal: 0 = primero en el sentido del recorrido */
  half?: 0 | 1;
}

export type CornerHalfRegion =
  | "upper-left"
  | "upper-right"
  | "lower-left"
  | "lower-right";

/**
 * Región visual de cada mitad esquinal, en orden de recorrido ↺.
 * El primer triángulo toca el borde por donde entra la ficha;
 * el segundo, el borde por donde sale hacia la siguiente casilla.
 */
export const CORNER_HALF_REGIONS: Record<
  number,
  readonly [CornerHalfRegion, CornerHalfRegion]
> = {
  61: ["upper-right", "lower-left"],
  117: ["upper-left", "lower-right"],
  121: ["lower-left", "upper-right"],
  65: ["lower-right", "upper-left"],
};

function corner(anchor: number): RouteCell[] {
  return [
    { anchor, half: 0 },
    { anchor, half: 1 },
  ];
}

/**
 * Ciclo antihorario ↺ del camino común — 44 pasos.
 * Blancas y puntas SAFE cuentan 1; cada esquina cuenta 2 (sus triángulos).
 */
export const TRACK_CYCLE: readonly RouteCell[] = [
  { anchor: 33 },
  { anchor: 47 },
  ...corner(61),
  { anchor: 60 },
  { anchor: 59 },
  { anchor: 58 },
  { anchor: 57 },
  { anchor: 85 },
  { anchor: 113 },
  { anchor: 114 },
  { anchor: 115 },
  { anchor: 116 },
  ...corner(117),
  { anchor: 145 },
  { anchor: 159 },
  { anchor: 173 },
  { anchor: 187 },
  { anchor: 189 },
  { anchor: 191 },
  { anchor: 177 },
  { anchor: 163 },
  { anchor: 149 },
  ...corner(121),
  { anchor: 123 },
  { anchor: 124 },
  { anchor: 125 },
  { anchor: 126 },
  { anchor: 98 },
  { anchor: 70 },
  { anchor: 69 },
  { anchor: 68 },
  { anchor: 67 },
  ...corner(65),
  { anchor: 51 },
  { anchor: 37 },
  { anchor: 23 },
  { anchor: 9 },
  { anchor: 7 },
  { anchor: 5 },
  { anchor: 19 },
];

/** Índice de la casilla de salida (EXIT) de cada jugador dentro del ciclo */
const EXIT_CYCLE_INDEX: Record<PlayerColor, number> = {
  red: 0,
  yellow: 11,
  blue: 22,
  green: 33,
};

/** Tramo de llegada coloreado (tras el SAFE propio) hacia el centro */
const HOME_STRETCH: Record<PlayerColor, readonly number[]> = {
  red: [21, 35, 49, 63, 77],
  yellow: [86, 87, 88, 89, 90],
  blue: [175, 161, 147, 133, 119],
  green: [97, 96, 95, 94, 93],
};

/** Pasos sobre el ciclo desde el EXIT propio hasta el SAFE propio */
const STEPS_TO_OWN_SAFE = 41;

function buildRoute(player: PlayerColor): readonly RouteCell[] {
  const start = EXIT_CYCLE_INDEX[player];
  const track = Array.from(
    { length: STEPS_TO_OWN_SAFE + 1 },
    (_, i) => TRACK_CYCLE[(start + i) % TRACK_CYCLE.length],
  );
  const home = HOME_STRETCH[player].map((anchor) => ({ anchor }));
  /* Último paso: la casilla café central — solo se alcanza con caída exacta */
  return [...track, ...home, { anchor: VICTORY_CELL_ANCHOR }];
}

/**
 * Recorrido completo por jugador, paso por paso:
 * EXIT (índice 0) → vuelta ↺ al tablero → SAFE propio → llegada coloreada
 * → casilla café central (victoria).
 */
export const PLAYER_ROUTES: Record<PlayerColor, readonly RouteCell[]> = {
  red: buildRoute("red"),
  green: buildRoute("green"),
  yellow: buildRoute("yellow"),
  blue: buildRoute("blue"),
};

export function getRouteCell(
  player: PlayerColor,
  routeIndex: number,
): RouteCell | undefined {
  return PLAYER_ROUTES[player][routeIndex];
}

export function getRouteLength(player: PlayerColor): number {
  return PLAYER_ROUTES[player].length;
}

/** Índice de la casilla café (victoria) — último paso del recorrido */
export function getVictoryRouteIndex(player: PlayerColor): number {
  return PLAYER_ROUTES[player].length - 1;
}

export function routeCellEquals(
  a: RouteCell | undefined,
  b: RouteCell | undefined,
): boolean {
  if (!a || !b) return false;
  return a.anchor === b.anchor && a.half === b.half;
}
