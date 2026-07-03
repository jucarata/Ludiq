import type { PlayerColor, StartCellState } from "@/lib/board/types";
import { PLAYER_COLORS } from "@/lib/board/types";
import { GamePiece } from "../GamePiece";
import { CellShell, GridNumber } from "./CellChrome";

export interface StartCellProps {
  /** Color del jugador */
  color: PlayerColor;
  /** vacía = sin ficha · occupied = con ficha */
  state: StartCellState;
  gridNumber?: number;
  style?: React.CSSProperties;
}

/**
 * Celda de inicio 1×1 — donde nace cada ficha en la base.
 * Fondo oscuro del color del jugador; la ficha solo aparece si `state` es `occupied`.
 */
export function StartCell({
  color,
  state,
  gridNumber,
  style: gridStyle,
}: StartCellProps) {
  return (
    <CellShell
      gridStyle={gridStyle}
      className="flex items-center justify-center"
      style={{ backgroundColor: PLAYER_COLORS[color].dark }}
    >
      {gridNumber !== undefined && <GridNumber n={gridNumber} dark={false} />}
      {state === "occupied" && <GamePiece color={color} />}
    </CellShell>
  );
}
