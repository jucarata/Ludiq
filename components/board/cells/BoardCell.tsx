import type { CellData } from "@/lib/board/types";
import {
  isExitCell,
  isMovementCell,
  isSafeCell,
  isVictoryCell,
} from "@/lib/board/cell-roles";
import { BasicCell } from "./BasicCell";
import { CornerCell } from "./CornerCell";
import { DecorationCell } from "./DecorationCell";
import { ExitCell } from "./ExitCell";
import { SafeBasicCell } from "./SafeBasicCell";
import { SafeCornerCell } from "./SafeCornerCell";
import { getCellAppearance, isDarkLabel } from "./CellChrome";
import { VictoryCell } from "./VictoryCell";

export interface BoardCellProps {
  cell: CellData;
  style?: React.CSSProperties;
}

/** Enruta cada celda a su componente según rol, modo y shape */
export function BoardCell({ cell, style }: BoardCellProps) {
  if (cell.role === "decoration" && cell.owner) {
    return <DecorationCell color={cell.owner} style={style} />;
  }

  if (isVictoryCell(cell)) {
    return <VictoryCell movement={cell.movement} style={style} />;
  }

  if (isExitCell(cell)) {
    return <ExitCell cell={cell} movement={cell.movement} style={style} />;
  }

  if (isSafeCell(cell) && cell.shape === "corner" && cell.corner) {
    return <SafeCornerCell cell={cell} movement={cell.movement} style={style} />;
  }

  if (isSafeCell(cell) && cell.shape === "basic") {
    return <SafeBasicCell cell={cell} movement={cell.movement} style={style} />;
  }

  if (isMovementCell(cell) && cell.shape === "corner" && cell.corner) {
    return (
      <CornerCell
        movement={cell.movement}
        rotation={cell.corner.rotation}
        numbers={[cell.gridNumber, cell.corner.partnerNumber]}
        background={getCellAppearance(cell)}
        darkLabel={isDarkLabel(cell)}
        style={style}
      />
    );
  }

  if (isMovementCell(cell)) {
    return <BasicCell cell={cell} movement={cell.movement} style={style} />;
  }

  return null;
}

export { BasicCell } from "./BasicCell";
export { CornerCell } from "./CornerCell";
export { DecorationCell } from "./DecorationCell";
export { ExitCell } from "./ExitCell";
export { MovementCellRoot } from "./MovementCell";
export { SafeBasicCell } from "./SafeBasicCell";
export { SafeCornerCell } from "./SafeCornerCell";
export { ExitLabel } from "./ExitLabel";
export { MovementLabel } from "./MovementLabel";
export { SafeLabel } from "./SafeLabel";
export { VictoryCell } from "./VictoryCell";
export type { BasicCellProps } from "./BasicCell";
export type { CornerCellProps } from "./CornerCell";
export type { DecorationCellProps } from "./DecorationCell";
export type { ExitCellProps } from "./ExitCell";
export type { MovementCellProps } from "./MovementCell";
export type { SafeBasicCellProps } from "./SafeBasicCell";
export type { SafeCornerCellProps } from "./SafeCornerCell";
export type { ExitLabelProps } from "./ExitLabel";
export type { MovementLabelProps } from "./MovementLabel";
export type { SafeLabelProps } from "./SafeLabel";
export type { VictoryCellProps } from "./VictoryCell";
