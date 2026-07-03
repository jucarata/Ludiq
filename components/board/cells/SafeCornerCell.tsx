import type { CellData } from "@/lib/board/types";
import type { MovementCellProps } from "./MovementCell";
import { getCellAppearance, isDarkLabel } from "./CellChrome";
import { CornerCell } from "./CornerCell";
import { SafeLabel } from "./SafeLabel";

export interface SafeCornerCellProps extends MovementCellProps {
  cell: CellData;
  style?: React.CSSProperties;
}

/** Celda SAFE esquinal — hereda de CornerCell */
export function SafeCornerCell({ cell, movement, style }: SafeCornerCellProps) {
  if (!cell.safe || !cell.corner) return null;

  return (
    <CornerCell
      movement={movement}
      safe={cell.safe}
      rotation={cell.corner.rotation}
      numbers={[cell.gridNumber, cell.corner.partnerNumber]}
      background={getCellAppearance(cell)}
      darkLabel={isDarkLabel(cell)}
      primaryContent={<SafeLabel orientation={cell.safe.labelOrientation} />}
      style={style}
    />
  );
}
