/**
 * Recorrido antihorario (↺) del camino blanco.
 * Empieza en la salida roja (2,6). Total: 52 casillas.
 */
export const TRACK_ORDER: readonly (readonly [number, number])[] = [
  [2, 6], // 52 — EXIT rojo
  [2, 8],
  [3, 8],
  [4, 8],
  [5, 8],
  [6, 9],
  [6, 10],
  [6, 11],
  [6, 12], // 45 — EXIT verde
  [6, 13],
  [6, 14],
  [7, 14],
  [8, 14],
  [8, 13],
  [8, 12],
  [8, 11],
  [8, 10],
  [8, 9],
  [9, 8],
  [10, 8],
  [11, 8],
  [12, 8], // 33 — EXIT azul
  [13, 8],
  [14, 8],
  [14, 7],
  [14, 6],
  [13, 6],
  [12, 6],
  [11, 6],
  [10, 6],
  [9, 6],
  [8, 5],
  [8, 4],
  [8, 3],
  [8, 2], // 21 — EXIT amarillo
  [8, 1],
  [8, 0],
  [7, 0],
  [6, 0],
  [6, 1],
  [6, 2],
  [6, 3],
  [6, 4],
  [6, 5],
  [5, 6],
  [4, 6],
  [3, 6],
  [1, 6],
  [0, 6],
  [0, 7],
  [0, 8],
  [1, 8], // 1
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
