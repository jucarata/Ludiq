/**
 * Recorrido antihorario (↺) del camino blanco.
 * Empieza en (2,5). Total: 46 casillas.
 */
export const TRACK_ORDER: readonly (readonly [number, number])[] = [
  [2, 5],
  [2, 7],
  [3, 7],
  [4, 7],
  [5, 8],
  [5, 9],
  [5, 10],
  [5, 11],
  [5, 12],
  [5, 13],
  [6, 13],
  [7, 13],
  [7, 12],
  [7, 11],
  [7, 10],
  [7, 9],
  [9, 7],
  [10, 7],
  [11, 7],
  [12, 7],
  [13, 7],
  [13, 6],
  [13, 5],
  [12, 5],
  [11, 5],
  [10, 5],
  [9, 5],
  [8, 5],
  [7, 4],
  [7, 3],
  [7, 2],
  [7, 1],
  [7, 0],
  [6, 0],
  [5, 0],
  [5, 1],
  [5, 2],
  [5, 3],
  [5, 4],
  [4, 5],
  [3, 5],
  [1, 5],
  [0, 5],
  [0, 6],
  [0, 7],
  [1, 7],
] as const;

export const TRACK_TOTAL = TRACK_ORDER.length;

const trackMap = new Map<string, number>(
  TRACK_ORDER.map(([r, c], i) => [`${r},${c}`, TRACK_ORDER.length - i]),
);

export function getTrackNumber(r: number, c: number): number | undefined {
  return trackMap.get(`${r},${c}`);
}

export function getTrackCoord(
  number: number,
): readonly [number, number] | undefined {
  const index = TRACK_TOTAL - number;
  if (index < 0 || index >= TRACK_ORDER.length) return undefined;
  return TRACK_ORDER[index];
}
