import type { PlayerColor } from "@/lib/board/types";
import { PLAYER_COLORS } from "@/lib/board/types";
import { CellShell, GridNumber } from "./CellChrome";

export interface DecorationCellProps {
  /** Color del jugador (solo decoración visual) */
  color: PlayerColor;
  /** Número visible del tablero (opcional) */
  gridNumber?: number;
  style?: React.CSSProperties;
}

/**
 * Celda decorativa 1×1 — solo color, sin interacción de juego.
 * Típicamente rodea el bloque de fichas en cada base.
 */
export function DecorationCell({
  color,
  gridNumber,
  style: gridStyle,
}: DecorationCellProps) {
  return (
    <CellShell
      gridStyle={gridStyle}
      style={{ backgroundColor: PLAYER_COLORS[color].fill }}
    >
      {gridNumber !== undefined && (
        <GridNumber n={gridNumber} dark={false} />
      )}
    </CellShell>
  );
}
