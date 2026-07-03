import type { BasicOrientation } from "@/lib/board/cell-shapes";
import type { MovementCellData, SafeCellData } from "@/lib/board/types";

export interface MovementCellProps {
  movement?: MovementCellData;
  safe?: SafeCellData;
  /** Solo celdas basic — horizontal | vertical */
  basicOrientation?: BasicOrientation;
  style?: React.CSSProperties;
}

/**
 * Contenedor base de celdas de movimiento.
 * Heredado por BasicCell, CornerCell, SafeBasicCell, SafeCornerCell, ExitCell y VictoryCell.
 */
export function MovementCellRoot({
  movement,
  safe,
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
      data-safe={safe?.owner}
      data-safe-label={safe?.labelOrientation}
      data-basic-orientation={basicOrientation}
    >
      {children}
    </div>
  );
}
