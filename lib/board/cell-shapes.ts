/** Forma física de la celda en el tablero */
export type CellShape = "basic" | "corner" | "decoration" | "start";

/**
 * Rotación del corte esquinal (diagonal del cuadrado 2×2).
 * - down-right ↘  ·  down-left ↙
 * (up-right / up-left reservados para futuras rotaciones)
 */
export type CornerRotation = "down-right" | "down-left";

export type TriangleCorner = "upper-left" | "lower-right" | "upper-right" | "lower-left";

export interface CornerHalfLayout {
  corner: TriangleCorner;
  labelCorner: TriangleCorner;
}

export interface CornerRotationLayout {
  first: CornerHalfLayout;
  second: CornerHalfLayout;
  divider: { x1: number; y1: number; x2: number; y2: number };
}

export const TRIANGLE_CLIP: Record<TriangleCorner, string> = {
  "upper-left": "polygon(0 0, 100% 0, 0 100%)",
  "lower-right": "polygon(100% 0, 100% 100%, 0 100%)",
  "upper-right": "polygon(0 0, 100% 0, 100% 100%)",
  "lower-left": "polygon(0 0, 0 100%, 100% 100%)",
};

/** Geometría de cada rotación esquinal */
export const CORNER_ROTATION_LAYOUT: Record<CornerRotation, CornerRotationLayout> = {
  "down-right": {
    first: { corner: "upper-left", labelCorner: "upper-left" },
    second: { corner: "lower-right", labelCorner: "lower-right" },
    divider: { x1: 0, y1: 0, x2: 100, y2: 100 },
  },
  "down-left": {
    first: { corner: "upper-right", labelCorner: "upper-right" },
    second: { corner: "lower-left", labelCorner: "lower-left" },
    divider: { x1: 100, y1: 0, x2: 0, y2: 100 },
  },
};

export function getCornerRotationLayout(
  rotation: CornerRotation,
): CornerRotationLayout {
  return CORNER_ROTATION_LAYOUT[rotation];
}
