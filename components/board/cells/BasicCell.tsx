import type { CellData } from "@/lib/board/types";
import { isSafeMovementCell } from "@/lib/board/cell-roles";
import type { MovementCellProps } from "./MovementCell";
import { CellContent } from "./CellContent";
import { CellShell, getCellAppearance, GridNumber, isDarkLabel } from "./CellChrome";
import { MovementCellRoot } from "./MovementCell";

export interface BasicCellProps extends MovementCellProps {
  cell: CellData;
}

/** Celda de movimiento rectangular (2×1 horizontal o vertical) */
export function BasicCell({ cell, movement, style: gridStyle }: BasicCellProps) {
  const appearance = getCellAppearance(cell);
  const num = (
    <GridNumber n={cell.gridNumber} dark={isDarkLabel(cell)} />
  );
  const rootProps = {
    movement,
    basicOrientation: cell.basic?.orientation,
    style: gridStyle,
  };
  const isSafe = isSafeMovementCell(cell);

  return (
    <MovementCellRoot {...rootProps}>
      <CellShell
        className={
          isSafe
            ? `flex h-full w-full items-center justify-center ${appearance.className ?? ""}`
            : appearance.className
        }
        style={appearance.style}
      >
        {num}
        {isSafe && <CellContent cell={cell} />}
      </CellShell>
    </MovementCellRoot>
  );
}
