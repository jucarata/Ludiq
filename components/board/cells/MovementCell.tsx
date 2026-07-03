import type { BasicOrientation, MovementCellData } from "@/lib/board/types";

export interface MovementCellProps {
  movement?: MovementCellData;
  /** Solo celdas basic — horizontal | vertical */
  basicOrientation?: BasicOrientation;
  style?: React.CSSProperties;
}

/**
 * Contenedor base de celdas de movimiento.
 * Heredado por BasicCell, CornerCell y VictoryCell.
 */
export function MovementCellRoot({
  movement,
  basicOrientation,
  style,
  children,
}: MovementCellProps & { children: React.ReactNode }) {
  return (
    <div
      className="relative h-full w-full min-h-0 min-w-0"
      style={style}
      data-cell-role="movement"
      data-track={movement?.trackNumber}
      data-basic-orientation={basicOrientation}
    >
      {children}
    </div>
  );
}
