import type { CellData } from "@/lib/board/types";
import type { MovementCellProps } from "./MovementCell";
import { CellContent } from "./CellContent";
import { CellShell, getCellAppearance, GridNumber, isDarkLabel } from "./CellChrome";
import { MovementCellRoot } from "./MovementCell";

export interface BasicCellProps extends MovementCellProps {
  cell: CellData;
}

/** Celda de movimiento rectangular (1×1 o span mayor, sin corte diagonal) */
export function BasicCell({ cell, movement, style: gridStyle }: BasicCellProps) {
  const appearance = getCellAppearance(cell);
  const num = (
    <GridNumber n={cell.gridNumber} dark={isDarkLabel(cell)} />
  );

  if (cell.kind === "safe") {
    return (
      <MovementCellRoot movement={movement} style={gridStyle}>
        <CellShell
          className={`flex h-full w-full items-center justify-center ${appearance.className ?? ""}`}
          style={appearance.style}
        >
          {num}
          <CellContent cell={cell} />
        </CellShell>
      </MovementCellRoot>
    );
  }

  return (
    <MovementCellRoot movement={movement} style={gridStyle}>
      <CellShell className={appearance.className} style={appearance.style}>
        {num}
      </CellShell>
    </MovementCellRoot>
  );
}
