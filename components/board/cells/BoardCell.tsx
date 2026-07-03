import type { CellData } from "@/lib/board/types";
import { isMovementCell, isVictoryCell } from "@/lib/board/cell-roles";
import { BasicCell } from "./BasicCell";
import { CellContent } from "./CellContent";
import { getCellAppearance, isDarkLabel } from "./CellChrome";
import { CornerCell } from "./CornerCell";
import { DecorationCell } from "./DecorationCell";
import { StartCell } from "./StartCell";
import { VictoryCell } from "./VictoryCell";

export interface BoardCellProps {
  cell: CellData;
  style?: React.CSSProperties;
}

/** Enruta cada celda a su componente según `cell.role` y `cell.shape` */
export function BoardCell({ cell, style }: BoardCellProps) {
  if (cell.role === "start" && cell.owner && cell.start) {
    return (
      <StartCell
        color={cell.owner}
        state={cell.start.state}
        gridNumber={cell.gridNumber}
        style={style}
      />
    );
  }

  if (cell.role === "decoration" && cell.owner) {
    return (
      <DecorationCell
        color={cell.owner}
        gridNumber={cell.gridNumber}
        style={style}
      />
    );
  }

  if (isVictoryCell(cell)) {
    return (
      <VictoryCell
        gridNumber={cell.gridNumber}
        movement={cell.movement}
        style={style}
      />
    );
  }

  if (isMovementCell(cell) && cell.shape === "corner" && cell.corner) {
    return (
      <CornerCell
        movement={cell.movement}
        rotation={cell.corner.rotation}
        numbers={[cell.gridNumber, cell.corner.partnerNumber]}
        background={getCellAppearance(cell)}
        darkLabel={isDarkLabel(cell)}
        primaryContent={<CellContent cell={cell} />}
        style={style}
      />
    );
  }

  if (isMovementCell(cell)) {
    return (
      <BasicCell cell={cell} movement={cell.movement} style={style} />
    );
  }

  return null;
}

export { BasicCell } from "./BasicCell";
export { CornerCell } from "./CornerCell";
export { DecorationCell } from "./DecorationCell";
export { MovementCellRoot } from "./MovementCell";
export { StartCell } from "./StartCell";
export { VictoryCell } from "./VictoryCell";
export type { CornerCellProps } from "./CornerCell";
export type { DecorationCellProps } from "./DecorationCell";
export type { MovementCellProps } from "./MovementCell";
export type { StartCellProps } from "./StartCell";
export type { VictoryCellProps } from "./VictoryCell";
