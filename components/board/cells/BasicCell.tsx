import type { CellData } from "@/lib/board/types";
import { CellContent } from "./CellContent";
import { CellShell, getCellAppearance, GridNumber, isDarkLabel } from "./CellChrome";

export interface BasicCellProps {
  cell: CellData;
  style?: React.CSSProperties;
}

/** Celda rectangular estándar (1×1 o span mayor sin corte diagonal) */
export function BasicCell({ cell, style: gridStyle }: BasicCellProps) {
  const appearance = getCellAppearance(cell);
  const num = (
    <GridNumber n={cell.gridNumber} dark={isDarkLabel(cell)} />
  );

  if (cell.kind === "safe") {
    return (
      <CellShell
        gridStyle={gridStyle}
        className={`flex items-center justify-center ${appearance.className ?? ""}`}
        style={appearance.style}
      >
        {num}
        <CellContent cell={cell} />
      </CellShell>
    );
  }

  if (cell.kind === "victory") {
    return (
      <CellShell
        gridStyle={gridStyle}
        className="flex items-center justify-center"
        style={appearance.style}
      >
        {num}
        <CellContent cell={cell} />
      </CellShell>
    );
  }

  return (
    <CellShell
      gridStyle={gridStyle}
      className={appearance.className}
      style={appearance.style}
    >
      {num}
    </CellShell>
  );
}
