import type { CellData } from "@/lib/board/types";
import type { MovementCellProps } from "./MovementCell";
import { CellShell, getCellAppearance } from "./CellChrome";
import { MovementCellRoot } from "./MovementCell";

export interface BasicCellProps extends MovementCellProps {
  cell: CellData;
  children?: React.ReactNode;
}

/** Celda de movimiento rectangular (2×1 horizontal o vertical) */
export function BasicCell({
  cell,
  movement,
  style: gridStyle,
  children,
}: BasicCellProps) {
  const appearance = getCellAppearance(cell);

  return (
    <MovementCellRoot
      movement={movement}
      safe={cell.safe}
      basicOrientation={cell.basic?.orientation}
      style={gridStyle}
    >
      <CellShell className={appearance.className} style={appearance.style}>
        {children}
      </CellShell>
    </MovementCellRoot>
  );
}
