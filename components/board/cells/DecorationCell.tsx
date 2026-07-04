import type { PlayerColor } from "@/lib/board/types";
import { PLAYER_COLORS } from "@/lib/board/types";
import { CellShell } from "./CellChrome";

export interface DecorationCellProps {
  /** Color del jugador (solo decoración visual) */
  color: PlayerColor;
  style?: React.CSSProperties;
}

/**
 * Celda decorativa 1×1 — solo color, sin interacción de juego.
 * Típicamente rodea el bloque de fichas en cada casilla de inicio.
 */
export function DecorationCell({
  color,
  style: gridStyle,
}: DecorationCellProps) {
  return (
    <CellShell
      gridStyle={gridStyle}
      style={{ backgroundColor: PLAYER_COLORS[color].fill }}
    />
  );
}
